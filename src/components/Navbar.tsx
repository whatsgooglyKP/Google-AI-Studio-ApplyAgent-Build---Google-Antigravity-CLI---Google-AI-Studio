import React from 'react';
import { Briefcase, FileText, User, BarChart3, Plus, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: 'discovery' | 'pipeline' | 'profile' | 'analytics';
  setActiveTab: (tab: 'discovery' | 'pipeline' | 'profile' | 'analytics') => void;
  onOpenProfile: () => void;
  onAddCustomJob: () => void;
  tailoredCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenProfile,
  onAddCustomJob,
  tailoredCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white shadow-sm font-semibold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  Antigravity AI
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Google x Kaggle Capstone
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Autonomous Job Discovery & One-Click Resume Tailoring
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('discovery')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'discovery'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Job Discovery</span>
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>My Applications</span>
              {tailoredCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold rounded-full bg-indigo-600 text-white">
                  {tailoredCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Market Insights</span>
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onAddCustomJob}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Add Listing</span>
            </button>

            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              title="Edit My Career Profile & Resume"
            >
              <User className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">My Profile</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Tabs */}
        <div className="flex md:hidden items-center justify-around border-t border-slate-100 py-2">
          <button
            onClick={() => setActiveTab('discovery')}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${
              activeTab === 'discovery' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Discovery</span>
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${
              activeTab === 'pipeline' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Applications ({tailoredCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${
              activeTab === 'analytics' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Insights</span>
          </button>
        </div>
      </div>
    </header>
  );
};
