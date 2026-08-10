import { JobListing, UserProfile } from '../types';

export const INITIAL_USER_PROFILE: UserProfile = {
  name: "Kevin Pinard",
  title: "AI Agentic Engineer / HR Analytics Professional",
  email: "Kevinpolymath@gmail.com",
  location: "Orlando, FL",
  experienceYears: 4,
  skills: [
    "AI Agentic Engineering",
    "Power BI",
    "SQL",
    "Google Antigravity CLI",
    "Google AI Studio",
    "Microsoft Copilot",
    "Azure Databricks",
    "Google Cloud Platform",
    "Presentation Skills",
    "Data Storytelling",
    "Strategy and Strategic Problem-Solving",
    "Communication",
    "MS Power Automate",
    "MS Office Suite"
  ],
  rawResumeText: `KEVIN PINARD
Kevinpolymath@gmail.com  |  +1 (352) 406-3847 |  LinkedIn  |  Portfolio Website  |  Github 

SUMMARY
Current M.S. in Artificial Intelligence student at Udacity with experience building AI agents. Former data analyst/data engineer with extensive professional experience using Microsoft Copilot to solve real business problems. I recently competed first hackathon on Kaggle where I built an agent with subagent architecture using Google Antigravity CLI with a Gemini Flash 3.5 engine. The agent is designed to help job seekers (specifically those displaced by AI) to find a job on LinkedIn. I recently started restructuring it in Google AI Studio, however because I saw that you’re looking for current Master’s degree students with agentic engineering experience, I couldn’t miss an opportunity to apply to Microsoft. I know it’s unorthodox for a thirty-seven-year-old to be in early-career mode let alone applying for collegiate internships, yet I’m a lifelong learner. I just want the opportunity to show that I can create value at a major tech company because I’m smart and will outwork every single member of my competition because I have an athlete’s mentality. If I work in a team, I bet by the end of my tenure as an intern I will have become team leader, it’s just how my mind works. Maybe I’m not the best coder, but I’m smart enough to delegate coding to an expert coder and make decisions on how they should proceed with the build based off their recommendations. I don’t care about my next salary, I’m mainly focused on finding an opportunity with meaningful, challenging work. 

SKILLS
AI Agentic Engineering | Power BI | SQL | Google Antigravity CLI | Google AI Studio | Microsoft Copilot | Azure Databricks | Google Cloud Platform | Presentation Skills | Data Storytelling | Strategy and Strategic Problem-Solving | Communication (Written and Verbal Communication skills) | MS Power Automate | MS Office Suite

EXPERIENCE
ORLANDO HEALTH, Data Analyst, HR Analytics 10/2023 – 03/2026
- Used Copilot to develop DAX code for Microsoft Power BI dashboards. 
- Spearheaded initiative to automate manually-updated HR dashboards using power automate resulting in 37% productivity boost.
- Worked cross-functionally and took ownership of full dashboard software lifecycle development for Physician Recruitment team. From creating data pipelines to augmenting automated refreshes, full Power BI builds all the way to KPI development. 
- Managed confidentiality for HR data to entire organization.
- Led migration from Excel master files to Azure Databricks. 
- Created Key-Matching system to audit SQL developer results. Used Copilot to edit SQL query for Exits and improved match rate for manager name column to Exits master file (source of truth) from 80% to 99.3%. 

AMAZON, Logistics Associate, 10/2017 – 05/2019
- Collaborated with management to lead Lean Six Sigma project for Scan Compliance Rate. 
- Identified root cause to be lack of training guidelines.
- Used creative problem-solving skills to reach out to a level 6 manager on LinkedIn and implemented three-pronged approach to training new hires on scan standard operating procedure. 
- Daily scan compliance rate average rose from 98.6% to over 99%. 

EDUCATION
Udacity, M.S., Artificial Intelligence, 03/2026 – present
Springboard, Bootcamp, Data Analytics Career Track, 02/2022 – 03/2023
Udacity, Nanodegree, Business Analytics, 06/2016 – 01/2017
Seminole State College of Florida, Technical Cert., Computer Programming, 05/2015 – 06/2016
Rollins College, B.A., Economics, 08/2011 – 08/2014
Seminole State College of Florida A.A., Business, 06/2008 – 05/2010`
};

export const SAMPLE_JOBS: JobListing[] = [];

export const INITIAL_APPLICATIONS: import('../types').TailoredApplication[] = [];
