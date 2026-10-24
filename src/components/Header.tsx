import React, { useState, useEffect } from 'react';
import {
  Camera,
  CameraOff,
  Settings,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { ActiveTask } from '../types';
import { cameraManager, CameraSessionInfo } from '../services/cameraManager';
import { speechService } from '../services/speech';

interface HeaderProps {
  activeTask: ActiveTask;
  onSelectTask: (task: ActiveTask) => void;
  onOpenSettings: () => void;
  onToggleCameraQuick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTask,
  onSelectTask,
  onOpenSettings,
  onToggleCameraQuick,
}) => {
  const [cameraSession, setCameraSession] = useState<CameraSessionInfo>(cameraManager.getSessionInfo());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    const unsubCamera = cameraManager.subscribe((info) => {
      setCameraSession(info);
    });
    const unsubSpeech = speechService.subscribe((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => {
      unsubCamera();
      unsubSpeech();
    };
  }, []);

  const getCameraLabel = () => {
    if (cameraSession.state === 'active') return 'Camera active';
    if (cameraSession.state === 'starting') return 'Starting camera...';
    if (cameraSession.state === 'stopping') return 'Stopping...';
    if (cameraSession.state === 'error') return 'Camera unavailable';
    return 'Camera off';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0c0609]/90 backdrop-blur-md border-b border-[#2D121F] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 select-none">
      {/* Left: Brand Identity matching image_e7ecfc04 */}
      <button
        onClick={() => onSelectTask('home')}
        className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899] rounded-xl p-1"
        aria-label="OmniLens Home"
      >
        {/* Glowing Eye Logo */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#00F0FF] via-[#EC4899] to-white p-0.5 shadow-lg shadow-[#00F0FF]/25 flex items-center justify-center transition-transform group-hover:scale-105">
          <div className="w-full h-full bg-[#12080D] rounded-full flex items-center justify-center relative overflow-hidden">
            <Eye className="w-5 h-5 text-white" />
            <div className="absolute inset-0 bg-radial from-[#00F0FF]/40 to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            OmniLens
          </span>

          <span className="hidden sm:inline-block text-[#3D1829] font-light text-xl">|</span>

          <span className="hidden sm:inline-block text-xs sm:text-sm text-[#FAF7F0]/70 font-medium">
            Understand your world. Through sound.
          </span>
        </div>
      </button>

      {/* Right: Camera status badge & Settings */}
      <div className="flex items-center gap-2.5">
        {/* Camera Status Pill Button */}
        <button
          onClick={() => {
            if (cameraSession.state === 'active') {
              cameraManager.releaseAll();
              speechService.speak('Camera stopped. Hardware resources released.');
            } else if (onToggleCameraQuick) {
              onToggleCameraQuick();
            } else {
              onSelectTask('live');
            }
          }}
          className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
            cameraSession.state === 'active'
              ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-emerald-950/40'
              : cameraSession.state === 'starting'
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
              : 'bg-[#1C0D15] border-[#3D1829] text-white/80 hover:bg-[#28111E] hover:border-[#521E36]'
          }`}
          title={cameraSession.state === 'active' ? 'Click to stop camera' : 'Camera status (click to manage)'}
          aria-label={getCameraLabel()}
        >
          {cameraSession.state === 'active' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
            </>
          ) : (
            <CameraOff className="w-3.5 h-3.5 text-white/60" />
          )}
          <span>{getCameraLabel()}</span>
        </button>

        {/* Global Speech Stop / Repeat control */}
        {isSpeaking && (
          <button
            onClick={() => speechService.stop()}
            className="p-2 rounded-full bg-[#EC4899]/20 border border-[#EC4899]/40 text-[#EC4899] hover:bg-[#EC4899]/30 transition-colors cursor-pointer"
            title="Stop active speech"
            aria-label="Stop speech"
          >
            <VolumeX className="w-4 h-4 animate-pulse" />
          </button>
        )}

        {/* Settings Gear Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 sm:p-2.5 rounded-full bg-[#1C0D15] border border-[#3D1829] text-white/80 hover:text-white hover:bg-[#28111E] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]"
          title="Open Settings"
          aria-label="Open settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
