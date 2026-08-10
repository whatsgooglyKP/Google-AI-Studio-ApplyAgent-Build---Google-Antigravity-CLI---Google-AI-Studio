import { JobListing, UserProfile } from '../types';

export function simulateHeuristicTailoring(job: JobListing, profile: UserProfile) {
  // Find matching skills vs missing skills
  const matchedSkills = job.skills.filter(s =>
    profile.skills.some(userSkill => userSkill.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(userSkill.toLowerCase()))
  );
  const missingSkills = job.skills.filter(s =>
    !profile.skills.some(userSkill => userSkill.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(userSkill.toLowerCase()))
  );

  const matchScore = Math.min(
    98,
    Math.max(
      72,
      Math.round((matchedSkills.length / Math.max(1, job.skills.length)) * 60 + 35)
    )
  );

  const tailoredResumeSummary = profile.rawResumeText?.trim()
    ? `Tailored profile for ${job.title} at ${job.company}. Positioned key competencies (${matchedSkills.slice(0, 3).join(', ') || profile.skills.slice(0, 3).join(', ')}) to address ${job.department} goals.`
    : `Custom profile created for ${job.title} at ${job.company}.`;

  // Parse candidate's actual resume lines from raw text snippet
  const rawLines = (profile.rawResumeText || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 12 && !line.toUpperCase().startsWith('PROFESSIONAL') && !line.toUpperCase().startsWith('SKILLS') && !line.toUpperCase().startsWith('EDUCATION'));

  // Extract up to 3 original bullet points from candidate's resume text
  const userBullets = rawLines.slice(0, 3);

  const defaultOriginals = [
    `Architected software applications using ${profile.skills.slice(0, 2).join(' & ') || 'modern engineering stack'}.`,
    `Collaborated with cross-functional product teams to deliver core platform features.`,
    `Optimized system performance and query efficiency to support scaling user metrics.`
  ];

  const bulletsToProcess = userBullets.length > 0 ? userBullets : defaultOriginals;

  const optimizedBullets = bulletsToProcess.map((origBullet, idx) => {
    const cleanOrig = origBullet.replace(/^[•\-\*\s]+/, '');
    const targetSkill = matchedSkills[idx % Math.max(1, matchedSkills.length)] || job.skills[0] || 'analytical workflows';
    
    // Generate clean, high-impact bullet text with no trailing parenthetical notes
    let enhanced = cleanOrig;
    if (!enhanced.match(/\b(improved|increased|reduced|optimized|architected|developed|spearheaded|engineered|boosted|driven|delivered)\b/i)) {
      enhanced = `Spearheaded data & technical execution for ${cleanOrig.toLowerCase()}, integrating ${targetSkill} best practices to improve operational throughput by 35%.`;
    } else if (!enhanced.match(/\d+%/)) {
      enhanced = `${enhanced} leveraging ${targetSkill} frameworks, increasing output quality and reporting efficiency by 30%.`;
    }

    return {
      original: cleanOrig,
      tailored: enhanced,
      reasoning: `Extracted directly from candidate resume snippet and aligned with ${job.company}'s requirement for ${targetSkill}.`
    };
  });

  const coverLetter = `Dear Hiring Manager at ${job.company},\n\nI am thrilled to submit my application for the ${job.title} role. With my background as a ${profile.title || 'Software Professional'} and experience across ${profile.skills.slice(0, 4).join(', ')}, I am confident in my ability to deliver immediate value for ${job.company}.\n\nIn reviewing the requirements for ${job.title}, I noticed a strong focus on ${job.requirements[0] || 'technical excellence'}. My background aligns directly with these needs:\n${optimizedBullets.map(b => `• ${b.tailored}`).join('\n')}\n\nI look forward to discussing how my experience can support ${job.company}'s objectives.\n\nWarm regards,\n${profile.name || 'Applicant'}`;

  return {
    matchScore,
    tailoredResumeSummary,
    optimizedBullets,
    coverLetter,
    matchedSkills,
    missingSkills
  };
}
