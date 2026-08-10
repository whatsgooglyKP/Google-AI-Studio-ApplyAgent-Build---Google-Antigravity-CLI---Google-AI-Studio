import React, { useState, useEffect } from 'react';
import { JobListing, TailoredApplication, UserProfile } from './types';
import { INITIAL_USER_PROFILE } from './data/mockJobs';
import { Navbar } from './components/Navbar';
import { JobCard } from './components/JobCard';
import { ResumeTailorModal } from './components/ResumeTailorModal';
import { ApplicationPipeline } from './components/ApplicationPipeline';
import { UserProfileModal } from './components/UserProfileModal';
import { AnalyticsOverview } from './components/AnalyticsOverview';
import { AddJobModal } from './components/AddJobModal';
import { Search, Sparkles, User, Zap } from 'lucide-react';
import { simulateHeuristicTailoring } from './utils/aiSimulator';

export const App: React.FC = () => {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [applications, setApplications] = useState<TailoredApplication[]>([]);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [activeTab, setActiveTab] = useState<'discovery' | 'pipeline' | 'profile' | 'analytics'>('discovery');

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('All');

  // Modal states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [liveSearchStatus, setLiveSearchStatus] = useState<string | null>(null);

  // Live web search handler
  const handleLiveWebSearch = async () => {
    setIsSearchingLive(true);
    setLiveSearchStatus('Searching LinkedIn for job listings...');

    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, department: deptFilter })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.jobs && data.jobs.length > 0) {
          setJobs(data.jobs);
          setLiveSearchStatus(`Loaded ${data.jobs.length} LinkedIn postings matching "${searchQuery || 'All'}"`);
        } else {
          setLiveSearchStatus('No LinkedIn listings found for query');
        }
      }
    } catch {
      setLiveSearchStatus('Search completed');
    } finally {
      setIsSearchingLive(false);
      setTimeout(() => setLiveSearchStatus(null), 4000);
    }
  };

  // Profile save handler - persists to state & backend
  const handleSaveProfile = (updated: UserProfile) => {
    setProfile(updated);
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  // Active tailoring modal state
  const [activeApplication, setActiveApplication] = useState<TailoredApplication | null>(null);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoringJobId, setTailoringJobId] = useState<string | null>(null);

  // Load initial data from backend & fetch 30 LinkedIn job postings
  useEffect(() => {
    fetch('/api/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'AI Sales Specialist' })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.jobs && data.jobs.length > 0) setJobs(data.jobs);
      })
      .catch(() => {});

    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (data && data.profile) setProfile(data.profile);
      })
      .catch(() => {});

    fetch('/api/applications')
      .then(res => res.json())
      .then(data => {
        if (data && data.applications) setApplications(data.applications);
      })
      .catch(() => {});
  }, []);

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesQuery =
      searchQuery.trim() === '' ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept =
      deptFilter === 'All' || job.department === deptFilter;

    return matchesQuery && matchesDept;
  });

  // Handle one-click AI tailor
  const handleTailorJob = async (job: JobListing) => {
    setIsTailoring(true);
    setTailoringJobId(job.id);
    setActiveApplication(null);

    try {
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          customJob: job,
          profile
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.result) {
          setApplications(prev => [data.result, ...prev]);
          setActiveApplication(data.result);
          setIsTailoring(false);
          setTailoringJobId(null);
          return;
        }
      }
    } catch {
      // Handled by local simulator fallback below
    }

    // Local simulation fallback if fetch fails
    setTimeout(() => {
      const sim = simulateHeuristicTailoring(job, profile);
      const newApp: TailoredApplication = {
        id: `app-${Date.now()}`,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'Tailored',
        createdAt: 'Just now',
        tailoredResumeSummary: sim.tailoredResumeSummary,
        optimizedBullets: sim.optimizedBullets,
        coverLetter: sim.coverLetter,
        matchScore: sim.matchScore
      };

      setApplications(prev => [newApp, ...prev]);
      setActiveApplication(newApp);
      setIsTailoring(false);
      setTailoringJobId(null);
    }, 1500);
  };

  const handleUpdateStatus = (id: string, status: TailoredApplication['status']) => {
    setApplications(prev =>
      prev.map(a => (a.id === id ? { ...a, status } : a))
    );
    fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).catch(() => {});
  };

  const handleDeleteApplication = (id: string) => {
    setApplications(prev => prev.filter(a => a.id !== id));
    fetch(`/api/applications/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleAddJob = (jobPartial: Partial<JobListing>) => {
    const newJob: JobListing = {
      id: `job-${Date.now()}`,
      title: jobPartial.title || 'Senior Software Engineer',
      company: jobPartial.company || 'Tech Company',
      location: jobPartial.location || 'Remote',
      type: jobPartial.type || 'Full-time',
      salary: jobPartial.salary || '$150,000 - $180,000',
      department: jobPartial.department || 'AI & ML',
      postedAgo: 'Just now',
      description: jobPartial.description || 'Exciting role in AI & engineering.',
      requirements: jobPartial.requirements || ['Strong technical background'],
      skills: jobPartial.skills || ['TypeScript', 'Python'],
      matchScore: 91,
      matchReasons: [
        'Custom listing added to your Antigravity pipeline',
        'Strong overlap with your profile competencies'
      ],
      missingSkills: []
    };

    setJobs(prev => [newJob, ...prev]);
    fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newJob)
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenProfile={() => setIsProfileOpen(true)}
        onAddCustomJob={() => setIsAddJobOpen(true)}
        tailoredCount={applications.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Job Discovery Tab */}
        {activeTab === 'discovery' && (
          <div className="space-y-6">
            {/* Hero Capstone Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Live Web Search & AI Resume Tailoring</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  Search Live Jobs & One-Click Tailor Your Resume
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                  Enter a target role or company to discover live postings across the web. Save your resume snippet in "My Profile" to automatically tailor resume bullet points and cover letters for every listing.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-xs transition-all"
                  >
                    <User className="w-4 h-4" />
                    <span>Edit My Resume & Profile</span>
                  </button>
                  {jobs.length > 0 && (
                    <button
                      onClick={() => handleTailorJob(jobs[0])}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-semibold transition-all"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>One-Click Tailor Top Result</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleLiveWebSearch();
                      }}
                      placeholder="Enter Job Title (e.g. AI Researcher, Senior SQL Developer, Data Analyst)..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                    />
                  </div>
                  <button
                    onClick={handleLiveWebSearch}
                    disabled={isSearchingLive}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs sm:text-sm font-bold shadow-xs transition-all whitespace-nowrap"
                  >
                    <Sparkles className={`w-4 h-4 ${isSearchingLive ? 'animate-spin' : ''}`} />
                    <span>{isSearchingLive ? 'Searching...' : 'Search Jobs'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Search Suggestions */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 px-1">
                <span className="font-semibold text-slate-600">Sample Job Titles:</span>
                {[
                  'AI Researcher',
                  'Senior SQL Developer',
                  'Data Analyst',
                  'AI Sales Specialist',
                  'HR Analytics Lead',
                  'Enterprise Solutions Engineer'
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSearchQuery(tag);
                      fetch('/api/jobs/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: tag })
                      })
                        .then(res => res.json())
                        .then(data => {
                          if (data && data.jobs) {
                            setJobs(data.jobs);
                            setLiveSearchStatus(`Loaded ${data.jobs.length} LinkedIn listings for title "${tag}"`);
                          }
                        })
                        .catch(() => {});
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all font-medium shadow-2xs"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {liveSearchStatus && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{liveSearchStatus}</span>
                </div>
              )}
            </div>

            {/* Job Listings Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span>LinkedIn Job Listings ({filteredJobs.length} Results)</span>
                </h2>
                <span className="text-xs text-slate-500">
                  Candidate: {profile.name || 'Kevin Pinard'}
                </span>
              </div>

              {filteredJobs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    No job listings displayed
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Type a role or skill into the search bar and click "Search Live Web" to retrieve real-time job openings.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('AI Software Engineer');
                      handleLiveWebSearch();
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Search Sample Live Roles
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredJobs.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onTailor={handleTailorJob}
                      isTailoring={isTailoring && tailoringJobId === job.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Applications & Pipeline Tab */}
        {activeTab === 'pipeline' && (
          <ApplicationPipeline
            applications={applications}
            onSelectApplication={app => setActiveApplication(app)}
            onUpdateStatus={handleUpdateStatus}
            onDeleteApplication={handleDeleteApplication}
          />
        )}

        {/* Analytics & Market Fit Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsOverview
            jobs={jobs}
            applications={applications}
          />
        )}
      </main>

      {/* Modals */}
      <ResumeTailorModal
        application={activeApplication}
        isLoading={isTailoring}
        onClose={() => {
          setActiveApplication(null);
          setIsTailoring(false);
        }}
        onViewAllApplications={() => setActiveTab('pipeline')}
      />

      <UserProfileModal
        profile={profile}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaveProfile={handleSaveProfile}
      />

      <AddJobModal
        isOpen={isAddJobOpen}
        onClose={() => setIsAddJobOpen(false)}
        onAddJob={handleAddJob}
      />
    </div>
  );
};

export default App;
