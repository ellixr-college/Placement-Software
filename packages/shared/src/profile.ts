export type ProfileFieldType = 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'year';

export interface ProfileField {
  key: string;
  label: string;
  type: ProfileFieldType;
  required: boolean;
  placeholder?: string;
}

export interface ProfileStep {
  key: string;
  label: string;
  fields: ProfileField[];
}

export const PROFILE_STEPS: ProfileStep[] = [
  {
    key: 'personal',
    label: 'Personal Information',
    fields: [
      { key: 'fullName', label: 'Full name', type: 'string', required: true },
      { key: 'phone', label: 'Personal mobile number', type: 'phone', required: true },
      { key: 'personalEmail', label: 'Personal email ID', type: 'email', required: true },
      { key: 'gender', label: 'Gender', type: 'string', required: true },
      { key: 'dateOfBirth', label: 'Date of birth', type: 'string', required: true },
      { key: 'nationality', label: 'Nationality', type: 'string', required: true },
      {
        key: 'panNumber',
        label: 'PAN number',
        type: 'string',
        required: false,
        placeholder: 'Optional',
      },
      { key: 'linkedinUrl', label: 'LinkedIn profile URL', type: 'string', required: true },
    ],
  },
  {
    key: 'address',
    label: 'Address & Family',
    fields: [
      { key: 'currentAddress', label: 'Current address', type: 'string', required: true },
      { key: 'permanentAddress', label: 'Permanent address', type: 'string', required: true },
      { key: 'city', label: 'City', type: 'string', required: true },
      { key: 'state', label: 'State', type: 'string', required: true },
      { key: 'pinCode', label: 'PIN code', type: 'string', required: true },
      { key: 'fatherName', label: "Father's name", type: 'string', required: true },
      { key: 'fatherOccupation', label: "Father's occupation", type: 'string', required: true },
      { key: 'fatherPhone', label: "Father's mobile number", type: 'phone', required: true },
    ],
  },
  {
    key: 'academic',
    label: 'Academic Details',
    fields: [
      { key: 'course', label: 'Programme', type: 'string', required: true },
      { key: 'branch', label: 'Department / Branch', type: 'string', required: true },
      { key: 'department', label: 'Department', type: 'string', required: true },
      { key: 'specialization', label: 'Specialization', type: 'string', required: true },
      { key: 'admissionYear', label: 'Admission year', type: 'year', required: true },
      { key: 'graduationYear', label: 'Expected graduation year', type: 'year', required: true },
      { key: 'currentSemester', label: 'Current semester', type: 'number', required: true },
      { key: 'cgpa', label: 'Current percentage / CGPA', type: 'number', required: true },
      { key: 'activeBacklogs', label: 'Standing arrears', type: 'number', required: true },
      { key: 'totalBacklogs', label: 'History of arrears', type: 'number', required: true },
      { key: 'hasArrearHistory', label: 'Any arrears history?', type: 'boolean', required: true },
    ],
  },
  {
    key: 'education',
    label: 'Education History',
    fields: [
      { key: 'tenthBoard', label: 'Class X board', type: 'string', required: true },
      { key: 'tenthSchool', label: 'Class X school name', type: 'string', required: true },
      { key: 'tenthPassingYear', label: 'Class X passing year', type: 'year', required: true },
      { key: 'tenthPercentage', label: 'Class X percentage', type: 'number', required: true },
      { key: 'twelfthBoard', label: 'Class XII / Diploma board', type: 'string', required: true },
      { key: 'twelfthSchool', label: 'Class XII school name', type: 'string', required: true },
      { key: 'twelfthStream', label: 'Stream', type: 'string', required: true },
      { key: 'twelfthPassingYear', label: 'Class XII passing year', type: 'year', required: true },
      { key: 'twelfthPercentage', label: 'Class XII percentage', type: 'number', required: true },
      { key: 'ugCollege', label: 'UG college (for PG students)', type: 'string', required: false },
      { key: 'ugDegree', label: 'UG degree', type: 'string', required: false },
      { key: 'ugSpecialization', label: 'UG specialization', type: 'string', required: false },
      { key: 'ugPercentage', label: 'UG percentage', type: 'number', required: false },
    ],
  },
  {
    key: 'skills',
    label: 'Skills & Preferences',
    fields: [
      {
        key: 'languagesKnown',
        label: 'Languages known',
        type: 'string',
        required: true,
        placeholder: 'e.g. English, Hindi, Tamil',
      },
      {
        key: 'communicationSkillRating',
        label: 'Communication skill rating',
        type: 'number',
        required: true,
        placeholder: '1–5',
      },
      {
        key: 'higherStudiesPlanned',
        label: 'Higher studies planned?',
        type: 'boolean',
        required: true,
      },
      {
        key: 'entrepreneurshipInterest',
        label: 'Entrepreneurship interest?',
        type: 'boolean',
        required: true,
      },
    ],
  },
];

export function isProfileFieldFilled(value: unknown, type: ProfileFieldType): boolean {
  if (value === undefined || value === null) return false;
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'number' || type === 'year') {
    if (typeof value === 'number') return !Number.isNaN(value);
    if (typeof value === 'string') {
      const n = Number(value);
      return value.trim() !== '' && !Number.isNaN(n);
    }
    return false;
  }
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

export interface StepCompletion {
  key: string;
  label: string;
  total: number;
  completed: number;
  percentage: number;
}

export interface ProfileCompletionResult {
  overall: number;
  steps: StepCompletion[];
}

export function computeProfileCompletion(
  profile: Record<string, unknown>,
): ProfileCompletionResult {
  const steps = PROFILE_STEPS.map((step) => {
    const requiredFields = step.fields.filter((f) => f.required);
    const completed = requiredFields.filter((f) =>
      isProfileFieldFilled(profile[f.key], f.type),
    ).length;
    const total = requiredFields.length;
    return {
      key: step.key,
      label: step.label,
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const total = steps.reduce((sum, s) => sum + s.total, 0);
  const completed = steps.reduce((sum, s) => sum + s.completed, 0);
  const overall = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { overall, steps };
}

/** Field keys the API/web should allow students to edit themselves. */
export const EDITABLE_PROFILE_FIELD_KEYS = PROFILE_STEPS.flatMap((s) => s.fields.map((f) => f.key));
