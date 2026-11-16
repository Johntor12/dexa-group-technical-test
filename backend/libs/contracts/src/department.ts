export const DepartmentCode = {
  SALES: 'SALES',
  MARKETING: 'MARKETING',
  PRODUCTION: 'PRODUCTION',
  FINANCE: 'FINANCE',
  HR: 'HR',
  IT: 'IT',
  R_AND_D: 'R_AND_D',
  LOGISTIC: 'LOGISTIC',
  ADMINISTRATION_AND_SECRETARY: 'ADMINISTRATION_AND_SECRETARY',
  DESIGN_DEPARTMENT: 'DESIGN_DEPARTMENT',
} as const;

export type DepartmentCode =
  (typeof DepartmentCode)[keyof typeof DepartmentCode];

export const departments = [
  { code: DepartmentCode.SALES, name: 'Sales' },
  { code: DepartmentCode.MARKETING, name: 'Marketing' },
  { code: DepartmentCode.PRODUCTION, name: 'Production' },
  { code: DepartmentCode.FINANCE, name: 'Finance' },
  { code: DepartmentCode.HR, name: 'HR' },
  { code: DepartmentCode.IT, name: 'IT' },
  { code: DepartmentCode.R_AND_D, name: 'R&D' },
  { code: DepartmentCode.LOGISTIC, name: 'Logistic' },
  {
    code: DepartmentCode.ADMINISTRATION_AND_SECRETARY,
    name: 'Administration & Secretary',
  },
  { code: DepartmentCode.DESIGN_DEPARTMENT, name: 'Design Department' },
] as const;
