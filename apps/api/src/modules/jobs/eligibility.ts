// Single source of truth for job ↔ student eligibility. Used both to build the
// student feed / officer preview and to re-validate server-side at apply time
// (feed visibility is a convenience, NOT the security boundary).

export interface EligibilityStudent {
  verificationStatus: string;
  isPlaced: boolean;
  course: string;
  branch: string;
  graduationYear: number;
  cgpa: number | null;
  tenthPercentage: number | null;
  twelfthPercentage: number | null;
  ugPercentage: number | null;
  gender: string | null;
  activeBacklogs: number;
  totalBacklogs: number;
  hasResume: boolean;
}

export interface EligibilityJob {
  eligibleCourses: string[];
  eligibleBranches: string[];
  graduationYears: number[];
  minCgpa: number | null;
  minTenthPercentage: number | null;
  minTwelfthPercentage: number | null;
  minUgPercentage: number | null;
  eligibleGenders: string[];
  maxActiveBacklogs: number | null;
  maxTotalBacklogs: number | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

function runEligibilityChecks(
  student: EligibilityStudent,
  job: EligibilityJob,
  options: { requireVerified?: boolean; requireResume?: boolean },
): EligibilityResult {
  const reasons: string[] = [];

  if (options.requireVerified && student.verificationStatus !== 'VERIFIED') {
    reasons.push('Profile not verified');
  }
  if (student.isPlaced) reasons.push('Already placed');
  // Course / branch / gender comparisons are case-insensitive and tolerate whitespace.
  // Empty arrays mean "no filter" (common for quick/no-criteria jobs).
  const normalizedCourses = job.eligibleCourses.map((c) => c.trim().toLowerCase());
  if (
    job.eligibleCourses.length > 0 &&
    !normalizedCourses.includes(student.course.trim().toLowerCase())
  ) {
    reasons.push('Course not eligible');
  }
  // Branch is intentionally NOT a restriction — students may apply across branches.
  if (job.graduationYears.length > 0 && !job.graduationYears.includes(student.graduationYear)) {
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
    job.minUgPercentage != null &&
    (student.ugPercentage == null || student.ugPercentage < job.minUgPercentage)
  ) {
    reasons.push(`UG below ${job.minUgPercentage}%`);
  }
  const normalizedGenders = job.eligibleGenders.map((g) => g.trim().toUpperCase());
  if (
    job.eligibleGenders.length > 0 &&
    (!student.gender || !normalizedGenders.includes(student.gender.trim().toUpperCase()))
  ) {
    reasons.push(student.gender ? 'Gender not eligible' : 'Gender not set');
  }
  if (job.maxActiveBacklogs != null && student.activeBacklogs > job.maxActiveBacklogs) {
    reasons.push('Too many active backlogs');
  }
  if (job.maxTotalBacklogs != null && student.totalBacklogs > job.maxTotalBacklogs) {
    reasons.push('Too many total backlogs');
  }
  if (options.requireResume && !student.hasResume) {
    reasons.push('Resume not uploaded');
  }

  return { eligible: reasons.length === 0, reasons };
}

/** Strict eligibility check used for officer previews / verification workflows. */
export function checkEligibility(
  student: EligibilityStudent,
  job: EligibilityJob,
): EligibilityResult {
  return runEligibilityChecks(student, job, { requireVerified: true, requireResume: false });
}

/** Application-time eligibility: students can apply once their profile + resume are
 * complete enough, even if the placement officer has not verified them yet. */
export function checkApplyEligibility(
  student: EligibilityStudent,
  job: EligibilityJob,
): EligibilityResult {
  return runEligibilityChecks(student, job, { requireVerified: false, requireResume: true });
}
