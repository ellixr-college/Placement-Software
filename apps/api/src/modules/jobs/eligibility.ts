// Single source of truth for job ↔ student eligibility. Used both to build the
// student feed / officer preview and to re-validate server-side at apply time
// (feed visibility is a convenience, NOT the security boundary).

export interface EligibilityStudent {
  verificationStatus: string;
  status: string;
  course: string;
  branch: string;
  graduationYear: number;
  cgpa: number | null;
  tenthPercentage: number | null;
  twelfthPercentage: number | null;
  gender: string | null;
  activeBacklogs: number;
  totalBacklogs: number;
}

export interface EligibilityJob {
  eligibleCourses: string[];
  eligibleBranches: string[];
  graduationYears: number[];
  minCgpa: number | null;
  minTenthPercentage: number | null;
  minTwelfthPercentage: number | null;
  eligibleGenders: string[];
  maxActiveBacklogs: number | null;
  maxTotalBacklogs: number | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export function checkEligibility(
  student: EligibilityStudent,
  job: EligibilityJob,
): EligibilityResult {
  const reasons: string[] = [];

  if (student.verificationStatus !== 'VERIFIED') reasons.push('Profile not verified');
  if (student.status === 'PLACED') reasons.push('Already placed');
  if (!job.eligibleCourses.includes(student.course)) reasons.push('Course not eligible');
  // Empty eligibleBranches = branch is not a filter (e.g. courses with no branches).
  if (job.eligibleBranches.length > 0 && !job.eligibleBranches.includes(student.branch)) {
    reasons.push('Branch not eligible');
  }
  if (!job.graduationYears.includes(student.graduationYear)) {
    reasons.push('Graduation year not eligible');
  }
  if (job.minCgpa != null && (student.cgpa == null || student.cgpa < job.minCgpa)) {
    reasons.push(`Percentage below ${job.minCgpa}%`);
  }
  if (
    job.minTenthPercentage != null &&
    (student.tenthPercentage == null || student.tenthPercentage < job.minTenthPercentage)
  ) {
    reasons.push(`10th below ${job.minTenthPercentage}%`);
  }
  if (
    job.minTwelfthPercentage != null &&
    (student.twelfthPercentage == null || student.twelfthPercentage < job.minTwelfthPercentage)
  ) {
    reasons.push(`12th below ${job.minTwelfthPercentage}%`);
  }
  if (
    job.eligibleGenders.length > 0 &&
    (!student.gender || !job.eligibleGenders.includes(student.gender))
  ) {
    reasons.push('Gender not eligible');
  }
  if (job.maxActiveBacklogs != null && student.activeBacklogs > job.maxActiveBacklogs) {
    reasons.push('Too many active backlogs');
  }
  if (job.maxTotalBacklogs != null && student.totalBacklogs > job.maxTotalBacklogs) {
    reasons.push('Too many total backlogs');
  }

  return { eligible: reasons.length === 0, reasons };
}
