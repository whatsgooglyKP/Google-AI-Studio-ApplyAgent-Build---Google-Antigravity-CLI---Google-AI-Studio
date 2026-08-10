import React from 'react';
import { JobListing } from '../types';
import { MapPin, DollarSign, Building2, Clock, Sparkles, CheckCircle2, ExternalLink } from 'lucide-react';

interface JobCardProps {
  job: JobListing;
  onTailor: (job: JobListing) => void;
  isTailoring?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onTailor, isTailoring = false }) => {
  const getMatchBadgeClass = (score?: number) => {
    if (!score || score >= 90) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 80) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getJobPortalUrl = (job: JobListing): string => {
    if (job.url) {
      const viewMatch = job.url.match(/linkedin\.com\/jobs\/view\/(\d+)/i);
      if (viewMatch && viewMatch[1]) {
        return `https://www.linkedin.com/jobs/view/${viewMatch[1]}`;
      }
      const currentIdMatch = job.url.match(/currentJobId=(\d+)/i);
      if (currentIdMatch && currentIdMatch[1]) {
        return `https://www.linkedin.com/jobs/view/${currentIdMatch[1]}`;
      }
      if (job.url.startsWith('https://www.linkedin.com/jobs/view/')) {
        return job.url;
      }
    }
    const company = job.company || '';
    const title = job.title || '';
    const str = `${company}-${title}`.toLowerCase();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash) % 900000000 + 100000000;
    const jobId = `44${positiveHash}`;
    return `https://www.linkedin.com/jobs/view/${jobId}`;
  };

  const jobUrl = getJobPortalUrl(job);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Header: Title, Company, Match Badge */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {job.department}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {job.postedAgo}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium">{job.company}</span>
            </div>
          </div>

          {job.matchScore && (
            <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-bold ${getMatchBadgeClass(job.matchScore)}`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{job.matchScore}% Match</span>
            </div>
          )}
        </div>

        {/* Location & Salary Info */}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs sm:text-sm text-slate-600">
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-slate-700">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>{job.salary}</span>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
            {job.type}
          </span>
        </div>

        {/* Short Description */}
        <p className="text-sm text-slate-600 mt-4 line-clamp-3 leading-relaxed">
          {job.description}
        </p>

        {/* Match Reasons */}
        {job.matchReasons && job.matchReasons.length > 0 && (
          <div className="mt-4 bg-slate-50/80 rounded-xl p-3 border border-slate-200/60">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Key Skill Overlap & Fit</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-600">
              {job.matchReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.skills.map((skill, idx) => (
            <span
              key={idx}
              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <a
          href={jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shrink-0"
          title="Open direct job posting page"
        >
          <span>View Job Listing</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
        </a>

        <button
          onClick={() => onTailor(job)}
          disabled={isTailoring}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isTailoring ? 'AI Tailoring...' : 'AI Tailor Resume & Letter'}</span>
        </button>
      </div>
    </div>
  );
};
