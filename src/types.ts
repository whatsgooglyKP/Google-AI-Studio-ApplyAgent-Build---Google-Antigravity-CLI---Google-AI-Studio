export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Contract' | 'Remote' | 'Hybrid';
  salary: string;
  department: 'AI & ML' | 'Engineering' | 'Data Science' | 'Product' | 'Design' | 'Marketing';
  postedAgo: string;
  description: string;
  requirements: string[];
  skills: string[];
  matchScore?: number;
  matchReasons?: string[];
  missingSkills?: string[];
  url?: string;
}

export interface TailoredApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'Saved' | 'Tailored' | 'Applied' | 'Interviewing';
  createdAt: string;
  tailoredResumeSummary: string;
  optimizedBullets: {
    original: string;
    tailored: string;
    reasoning: string;
  }[];
  coverLetter: string;
  matchScore: number;
}

export interface UserProfile {
  name: string;
  title: string;
  email: string;
  location: string;
  experienceYears: number;
  skills: string[];
  rawResumeText: string;
}

export interface CareerMetrics {
  totalScraped: number;
  highMatchJobs: number;
  tailoredCount: number;
  appliedCount: number;
  averageMatchScore: number;
  topInDemandSkills: { skill: string; count: number }[];
}
