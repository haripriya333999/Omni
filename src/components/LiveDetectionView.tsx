import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Play,
  Pause,
  Square,
  Volume2,
  RefreshCw,
  Camera,
  CameraOff,
  AlertCircle,
  Clock,
  Sparkles,
  FlipHorizontal,
  Sliders,
  Scan,
} from 'lucide-react';
import { ActiveTask, Detection } from '../types';
import { speechService } from '../services/speech';
import { apiService } from '../services/apiService';
import { cameraManager } from '../services/cameraManager';

interface LiveDetectionViewProps {
  highContrast?: boolean;
  onSwitchTask?: (task: ActiveTask) => void;
}

interface AnnouncementItem {
  id: string;
  time: string;
  text: string;
  type: 'detection' | 'guidance' | 'system';
}

export const LiveDetectionView: React.FC<LiveDetectionViewProps> = ({
  highContrast = false,
  onSwitchTask,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [intervalSec, setIntervalSec] = useState<number>(3);
  const [duplicateSuppression, setDuplicateSuppression] = useState<boolean>(true);
  const [invertLeftRight, setInvertLeftRight] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omnilens_accessibility');
      if (saved) {
        try {
          return JSON.parse(saved).invertLeftRight || false;
        } catch (e) {}
      }
    }
    return true; // Default to true for laptop webcam
  });

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<string>('Live detection ready. Press Start Camera & Stream.');
  const [detections, setDetections] = useState<Detection[]>([]);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'active' | 'stopping' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalTimerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const cameraRequestIdRef = useRef<number>(0);
  const lastSpokenMessageRef = useRef<string>('');

  const startCamera = async () => {
    const reqId = ++cameraRequestIdRef.current;
    setError(null);
    setCameraState('starting');

    try {
      const stream = await cameraManager.acquireSession('live-detection', {
        facingMode: 'user',
        idealWidth: 1280,
        idealHeight: 720,
      });

      if (!isMountedRef.current || cameraRequestIdRef.current !== reqId) {
        cameraManager.releaseSession('live-detection', videoRef.current);
        return;
      }

      if (videoRef.current) {
        cameraManager.attachToVideo(videoRef.current, stream);
        const isReady = await cameraManager.waitForVideoReady(videoRef.current, 2500);
        if (!isMountedRef.current || cameraRequestIdRef.current !== reqId) {
          cameraManager.releaseSession('live-detection', videoRef.current);
          return;
        }

        if (isReady) {
          setCameraActive(true);
          setCameraState('active');
        } else {
          setCameraActive(true);
          setCameraState('active');
        }
      }
    } catch (err: any) {
      if (cameraRequestIdRef.current !== reqId) return;
      console.warn('Live camera error:', err);
      const classified = cameraManager.classifyCameraError(err);
      setError(classified.message + ' ' + classified.guidance);
      setCameraActive(false);
      setCameraState('error');
      speechService.speak(classified.title + '. ' + classified.message, 'interrupt');
    }
  };

  const stopCameraStream = () => {
    cameraRequestIdRef.current++;
    setCameraState('stopping');
    cameraManager.releaseSession('live-detection', videoRef.current);
    setCameraActive(false);
    setCameraState('idle');
    setDetections([]);
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
    setIsRunning(false);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCameraStream();
      speechService.stop();
    };
  }, []);

  const processLiveFrame = async () => {
    if (!videoRef.current || !cameraActive || isProcessing) return;

    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const capture = await cameraManager.captureFrame(video, {
        mirror: invertLeftRight,
        quality: 0.85,
      });

      if (!capture || !isMountedRef.current) return;

      const res = await apiService.analyzeLiveStreamFrame(capture.dataUrl, 0.20);
      if (!isMountedRef.current) return;

      setDetections(res.detections || []);

      const spoken = res.speech_announcement || '';
      if (spoken) {
        const isDuplicate = duplicateSuppression && spoken.trim() === lastSpokenMessageRef.current.trim();
        if (!isDuplicate) {
          lastSpokenMessageRef.current = spoken;
          setLatestAnnouncement(spoken);
          setAnnouncements((prev) => [
            {
              id: `ann-${Date.now()}`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              text: spoken,
              type: 'detection',
            },
            ...prev.slice(0, 19),
          ]);
          speechService.speak(spoken, 'queue');
        }
      }
    } catch (err: any) {
      console.error('Live frame processing error:', err);
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const handleStartStream = async () => {
    if (!cameraActive) {
      await startCamera();
    }
    setIsRunning(true);
    speechService.speak('Continuous Live Detection active. Monitoring your surroundings.', 'interrupt');
    processLiveFrame();

    if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    intervalTimerRef.current = setInterval(() => {
      processLiveFrame();
    }, intervalSec * 1000);
  };

  const handlePauseStream = () => {
    setIsRunning(false);
    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }
    speechService.speak('Live detection stream paused. Camera is on standby.');
  };

  const handleStopAll = () => {
    stopCameraStream();
    speechService.speak('Live detection stopped. Camera hardware turned off.');
  };

  return (
    <div className="space-y-6 select-none" role="region" aria-label="Live Detection Stream Screen">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-[#180A10]/95 backdrop-blur-md border border-[#3E1627] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                isRunning
                  ? 'bg-emerald-400 animate-pulse'
                  : cameraActive
                  ? 'bg-amber-400'
                  : 'bg-white/30'
              }`}
            />
            <h2 className="text-xl font-extrabold text-white">
              Live Detection Stream
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isRunning
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : cameraActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-white/10 text-white/60 border-white/10'
              }`}
            >
              {isRunning ? 'Continuous Monitoring' : cameraActive ? 'Camera Standby' : 'Camera Off'}
            </span>
          </div>
          <p className="text-xs text-white/65">
            Monitors camera every {intervalSec}s with duplicate suppression to prevent repetitive audio.
          </p>
        </div>

        {/* Primary Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isRunning ? (
            <>
              <button
                onClick={handlePauseStream}
                className="py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md bg-amber-600 hover:bg-amber-700 text-white"
                aria-label="Pause Live Detection"
              >
                <Pause className="w-4 h-4" />
                <span>Pause (Standby)</span>
              </button>
              <button
                onClick={handleStopAll}
                className="py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md bg-rose-600 hover:bg-rose-700 text-white"
                aria-label="Stop camera and turn off hardware"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop Camera</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartStream}
                className="py-2.5 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-[#10B981]/25 bg-[#10B981] hover:bg-[#059669] text-white"
                aria-label="Start Live Detection"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{cameraActive ? 'Resume Stream' : 'Start Camera & Stream'}</span>
              </button>
              {cameraActive && (
                <button
                  onClick={handleStopAll}
                  className="py-2.5 px-3.5 rounded-xl bg-white/10 border border-white/15 hover:bg-rose-950/60 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  aria-label="Stop camera and release hardware"
                >
                  <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Turn Off Camera</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={() => speechService.stop()}
            className="py-2.5 px-3.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-200 border border-rose-600/40 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
            aria-label="Stop speaking immediately"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Stop Speaking</span>
          </button>

          <button
            onClick={() => speechService.repeat()}
            className="py-2.5 px-3.5 rounded-xl bg-[#220E19] border border-[#3E1627] hover:bg-[#331425] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            aria-label="Repeat last spoken announcement"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Repeat</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Camera on Left, Spoken Announcements on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl bg-[#180A10]/95 backdrop-blur-md border border-[#3E1627] shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#10B981]" />
                Live Camera Input
              </span>

              <button
                onClick={() => setInvertLeftRight(!invertLeftRight)}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  invertLeftRight
                    ? 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#220E19] border-[#3E1627] text-white/70'
                }`}
                title="Inverts preview so your real right is right, and real left is left"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>Laptop Mirror: {invertLeftRight ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-[#3E1627] shadow-inner">
              {error ? (
                <div className="p-6 text-center text-white space-y-3 max-w-sm">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs font-semibold leading-relaxed">{error}</p>
                  <button
                    onClick={startCamera}
                    className="mt-2 py-2 px-4 rounded-xl bg-[#10B981] text-white text-xs font-bold cursor-pointer"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                      invertLeftRight ? 'scale-x-[-1]' : ''
                    }`}
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/85 z-10 space-y-3">
                      {cameraState === 'starting' ? (
                        <>
                          <Activity className="w-8 h-8 text-[#10B981] animate-spin" />
                          <p className="text-xs font-bold text-white">Starting live camera stream...</p>
                        </>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-white/50" />
                          <p className="text-sm font-bold text-white">Live Camera is on Standby</p>
                          <p className="text-xs text-white/60 max-w-xs">
                            Press "Start Camera & Stream" to activate continuous object recognition.
                          </p>
                          <button
                            onClick={handleStartStream}
                            className="py-2.5 px-5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#10B981]/25 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start Camera & Stream</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Overlays */}
                  {cameraActive && detections.map((d, i) => {
                    const nb = d.normalizedBox || {
                      x: (d.box?.x || 0) / 640,
                      y: (d.box?.y || 0) / 480,
                      width: (d.box?.width || 0) / 640,
                      height: (d.box?.height || 0) / 480,
                    };
                    const leftPct = invertLeftRight ? (1 - (nb.x + nb.width)) * 100 : nb.x * 100;
                    return (
                      <div
                        key={d.id || i}
                        className="absolute border-2 border-[#10B981] bg-[#10B981]/20 rounded-lg pointer-events-none transition-all duration-300"
                        style={{
                          left: `${Math.max(0, Math.min(90, leftPct))}%`,
                          top: `${Math.max(0, Math.min(90, nb.y * 100))}%`,
                          width: `${Math.max(5, Math.min(100, nb.width * 100))}%`,
                          height: `${Math.max(5, Math.min(100, nb.height * 100))}%`,
                        }}
                      >
                        <span className="absolute -top-5 left-0 px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981] text-white whitespace-nowrap shadow-md">
                          {d.label} ({Math.round(d.confidence * 100)}%)
                        </span>
                      </div>
                    );
                  })}

                  {/* Processing Badge */}
                  {isProcessing && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-2 border border-white/10 shadow-lg">
                      <RefreshCw className="w-3 h-3 animate-spin text-[#10B981]" />
                      <span>Scanning frame...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Interval & Duplicate Suppression Toolbar */}
            <div className="p-3.5 rounded-2xl bg-[#220E19] border border-[#3E1627] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white/80">Interval:</span>
                {[2, 3, 5].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setIntervalSec(sec)}
                    className={`px-3 py-1 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                      intervalSec === sec
                        ? 'bg-[#10B981] text-white shadow-sm'
                        : 'bg-[#180A10] border border-[#3E1627] text-white/80 hover:bg-[#2C1220]'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-white/80">
                <input
                  type="checkbox"
                  checked={duplicateSuppression}
                  onChange={(e) => setDuplicateSuppression(e.target.checked)}
                  className="rounded text-[#10B981] focus:ring-[#10B981] cursor-pointer"
                />
                <span>Duplicate suppression (calm audio)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Announcements & History */}
        <div className="lg:col-span-5 space-y-4">
          {/* Latest Spoken Announcement Card */}
          <div className="p-6 rounded-3xl bg-[#180A10]/95 backdrop-blur-md border border-[#3E1627] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#10B981] flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                Latest Spoken Guidance
              </span>
              <span className="text-[10px] text-white/50 font-mono">
                Live Speech Stream
              </span>
            </div>

            <div
              className="p-4 rounded-2xl bg-[#220E19] border border-[#3E1627] text-white text-sm font-semibold leading-relaxed border-l-4 border-[#10B981]"
              aria-live="polite"
              aria-atomic="true"
            >
              "{latestAnnouncement}"
            </div>

            <p className="text-[11px] text-white/60">
              Announces changes in your physical surroundings based on detected objects, room elements, and human activity.
            </p>
          </div>

          {/* Announcement Timeline Log */}
          <div className="p-6 rounded-3xl bg-[#180A10]/95 backdrop-blur-md border border-[#3E1627] shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#311320]">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#10B981]" />
                Recent Announcements
              </span>
              <button
                onClick={() => setAnnouncements([])}
                className="text-[11px] font-bold text-[#10B981] hover:underline cursor-pointer"
              >
                Clear Log
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {announcements.length === 0 ? (
                <p className="text-xs text-white/40 italic py-4 text-center">
                  Waiting for detection stream...
                </p>
              ) : (
                announcements.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#220E19] border border-[#3E1627] flex items-start justify-between gap-3 text-xs"
                  >
                    <p className="text-white font-medium leading-snug">
                      {item.text}
                    </p>
                    <span className="text-[10px] font-mono text-white/50 shrink-0">
                      {item.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
