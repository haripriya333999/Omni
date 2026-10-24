import React, { useState, useEffect } from 'react';
import {
  Accessibility,
  Activity,
  ShieldCheck,
  ChevronRight,
  Camera,
  Mic,
  Eye,
  Scan,
  Volume2,
  Check,
} from 'lucide-react';
import { AccessibilitySettings } from '../types';
import { cameraManager, CameraSessionInfo } from '../services/cameraManager';
import { speechService } from '../services/speech';

interface RightPanelsProps {
  settings: AccessibilitySettings;
  onUpdateSettings: (newPartial: Partial<AccessibilitySettings>) => void;
  onOpenPrivacy: () => void;
}

export const RightPanels: React.FC<RightPanelsProps> = ({
  settings,
  onUpdateSettings,
  onOpenPrivacy,
}) => {
  const [cameraSession, setCameraSession] = useState<CameraSessionInfo>(cameraManager.getSessionInfo());
  const [micState, setMicState] = useState<'idle' | 'listening' | 'ready'>('idle');

  useEffect(() => {
    const unsub = cameraManager.subscribe((info) => {
      setCameraSession(info);
    });
    return unsub;
  }, []);

  const cycleFontSize = () => {
    const current = settings.fontSize || 'normal';
    const next = current === 'normal' ? 'large' : current === 'large' ? 'extra-large' : 'normal';
    onUpdateSettings({ fontSize: next });
    speechService.speak(`Text size set to ${next === 'extra-large' ? 'Extra Large' : next}`);
  };

  const cycleSpeechRate = () => {
    const current = settings.speechRate || 1.0;
    let next = 1.0;
    let label = 'Normal';
    if (current <= 1.0) {
      next = 1.25;
      label = 'Fast (1.25x)';
    } else if (current === 1.25) {
      next = 1.5;
      label = 'Fastest (1.5x)';
    } else {
      next = 0.85;
      label = 'Gentle (0.85x)';
    }
    onUpdateSettings({ speechRate: next });
    speechService.setRate(next);
    speechService.speak(`Speech speed set to ${label}`);
  };

  const getSpeechRateLabel = () => {
    const r = settings.speechRate || 1.0;
    if (r === 1.0) return 'Normal';
    if (r === 1.25) return '1.25x';
    if (r === 1.5) return '1.5x';
    if (r === 0.85) return '0.85x';
    return `${r}x`;
  };

  const getFontSizeLabel = () => {
    const s = settings.fontSize || 'normal';
    if (s === 'normal') return 'Normal';
    if (s === 'large') return 'Large';
    if (s === 'extra-large') return 'Extra Large';
    return 'Normal';
  };

  return (
    <aside
      className="w-full lg:w-72 space-y-4 shrink-0 select-none"
      aria-label="Accessibility and System Status"
    >
      {/* 1. Accessibility Panel matching image_e7ecfc04 */}
      <div className="bg-[#180A10]/90 backdrop-blur-md border border-[#311320] rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5 text-[#FAF7F0] font-bold text-sm">
          <Accessibility className="w-4 h-4 text-[#EC4899]" />
          <span>Accessibility</span>
        </div>

        <div className="space-y-3 text-xs">
          {/* Text size control */}
          <button
            onClick={cycleFontSize}
            className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-[#250F1A] transition-colors cursor-pointer text-left"
            title="Cycle text size between Normal, Large, and Extra Large"
          >
            <div className="flex items-center gap-2.5 text-white/80">
              <span className="font-serif font-bold text-sm">Aa</span>
              <span>Text size</span>
            </div>
            <div className="flex items-center gap-1 text-[#FAF7F0]/60 hover:text-white">
              <span>{getFontSizeLabel()}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* High contrast toggle */}
          <div className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-[#250F1A] transition-colors">
            <div className="flex items-center gap-2.5 text-white/80">
              <div className="w-4 h-4 rounded-full border border-white/60 bg-gradient-to-r from-white to-transparent" />
              <span>High contrast</span>
            </div>
            <button
              onClick={() => {
                const next = !settings.highContrast;
                onUpdateSettings({ highContrast: next });
                speechService.speak(next ? 'High contrast enabled' : 'High contrast disabled');
              }}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                settings.highContrast ? 'bg-[#EC4899]' : 'bg-white/20'
              }`}
              role="switch"
              aria-checked={settings.highContrast}
              aria-label="High contrast toggle"
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                  settings.highContrast ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reduced motion toggle */}
          <div className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-[#250F1A] transition-colors">
            <div className="flex items-center gap-2.5 text-white/80">
              <span className="text-sm">🔄</span>
              <span>Reduced motion</span>
            </div>
            <button
              onClick={() => {
                const next = !settings.reduceMotion;
                onUpdateSettings({ reduceMotion: next });
                speechService.speak(next ? 'Reduced motion enabled. Light trails static.' : 'Reduced motion disabled');
              }}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                settings.reduceMotion ? 'bg-[#EC4899]' : 'bg-white/20'
              }`}
              role="switch"
              aria-checked={settings.reduceMotion}
              aria-label="Reduced motion toggle"
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                  settings.reduceMotion ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Speech rate control */}
          <button
            onClick={cycleSpeechRate}
            className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-[#250F1A] transition-colors cursor-pointer text-left"
            title="Cycle speech playback speed"
          >
            <div className="flex items-center gap-2.5 text-white/80">
              <span className="text-sm">📶</span>
              <span>Speech rate</span>
            </div>
            <div className="flex items-center gap-1 text-[#FAF7F0]/60 hover:text-white">
              <span>{getSpeechRateLabel()}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* 2. System Status Panel matching image_e7ecfc04 */}
      <div className="bg-[#180A10]/90 backdrop-blur-md border border-[#311320] rounded-3xl p-5 shadow-lg space-y-3.5">
        <div className="flex items-center gap-2.5 text-[#FAF7F0] font-bold text-sm">
          <Activity className="w-4 h-4 text-[#00F0FF]" />
          <span>System Status</span>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Camera Status */}
          <div className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-2 text-white/75">
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  cameraSession.state === 'active'
                    ? 'bg-emerald-400 animate-pulse'
                    : cameraSession.state === 'starting'
                    ? 'bg-amber-400'
                    : 'bg-white/30'
                }`}
              />
              <span className="text-white/60">
                {cameraSession.state === 'active'
                  ? 'Active'
                  : cameraSession.state === 'starting'
                  ? 'Starting'
                  : 'Off'}
              </span>
            </div>
          </div>

          {/* Microphone Status */}
          <div className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-2 text-white/75">
              <Mic className="w-3.5 h-3.5" />
              <span>Microphone</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-white/30" />
              <span className="text-white/60">Not started</span>
            </div>
          </div>

          {/* Vision Model Status */}
          <div className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-2 text-white/75">
              <Eye className="w-3.5 h-3.5" />
              <span>Vision Model</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
              <span className="text-[#00F0FF]/90 font-semibold">Ready</span>
            </div>
          </div>

          {/* OCR Engine Status */}
          <div className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-2 text-white/75">
              <Scan className="w-3.5 h-3.5" />
              <span>OCR Engine</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
              <span className="text-[#00F0FF]/90 font-semibold">Ready</span>
            </div>
          </div>

          {/* Speech Service Status */}
          <div className="flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-2 text-white/75">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Speech Service</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 font-semibold">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Your Privacy Matters Card matching image_e7ecfc04 */}
      <button
        onClick={onOpenPrivacy}
        className="w-full bg-[#180A10]/90 backdrop-blur-md border border-[#311320] hover:border-[#521E36] hover:bg-[#230F1A] rounded-3xl p-4 shadow-lg flex items-center justify-between gap-3 text-left transition-all cursor-pointer group"
        aria-label="View privacy details"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
              Your privacy matters
            </div>
            <div className="text-[11px] text-white/60">
              Camera starts only when needed.
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors shrink-0" />
      </button>
    </aside>
  );
};
