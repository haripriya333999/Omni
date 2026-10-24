import React from 'react';
import {
  Home,
  Eye,
  Search,
  BookOpen,
  Footprints,
  Activity,
  Settings,
  HelpCircle,
  Scan,
} from 'lucide-react';
import { ActiveTask } from '../types';

interface SidebarProps {
  activeTask: ActiveTask;
  onSelectTask: (task: ActiveTask) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTask,
  onSelectTask,
  onOpenSettings,
  onOpenHelp,
}) => {
  const navItems = [
    { id: 'home' as ActiveTask, label: 'Home', icon: Home, accent: '#EC4899' },
    { id: 'describe' as ActiveTask, label: 'Describe Surroundings', icon: Eye, accent: '#EC4899' },
    { id: 'find' as ActiveTask, label: 'Find Object', icon: Search, accent: '#F59E0B' },
    { id: 'read' as ActiveTask, label: 'Read Text', icon: BookOpen, accent: '#FBBF24' },
    { id: 'safepath' as ActiveTask, label: 'SafePath', icon: Footprints, accent: '#06B6D4' },
    { id: 'live' as ActiveTask, label: 'Live Detection', icon: Scan, accent: '#10B981' },
  ];

  return (
    <aside
      className="w-full lg:w-60 bg-[#160A0F]/80 backdrop-blur-md border-r border-[#2D121F] p-4 flex flex-col justify-between shrink-0 select-none"
      aria-label="Main Navigation"
    >
      <nav className="space-y-1.5" role="navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTask === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTask(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899] ${
                isActive
                  ? 'bg-[#2C121D] text-white border border-[#521E33] shadow-md shadow-[#EC4899]/10'
                  : 'text-[#FAF7F0]/75 hover:text-white hover:bg-[#220E18] border border-transparent'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className="w-4 h-4 shrink-0 transition-colors"
                style={{ color: isActive ? item.accent : 'currentColor' }}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Settings & Help */}
      <div className="pt-4 border-t border-[#2D121F] space-y-1.5 mt-6">
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-left text-[#FAF7F0]/75 hover:text-white hover:bg-[#220E18] border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </button>

        <button
          onClick={onOpenHelp}
          className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-left text-[#FAF7F0]/75 hover:text-white hover:bg-[#220E18] border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Help</span>
        </button>
      </div>
    </aside>
  );
};
