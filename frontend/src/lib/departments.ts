import type { DepartmentCode } from './api'

const labels: Record<DepartmentCode, string> = {
  SALES: 'Sales',
  MARKETING: 'Marketing',
  PRODUCTION: 'Production',
  FINANCE: 'Finance',
  HR: 'HR',
  IT: 'IT',
  R_AND_D: 'R&D',
  LOGISTIC: 'Logistic',
  ADMINISTRATION_AND_SECRETARY: 'Administration & Secretary',
  DESIGN_DEPARTMENT: 'Design Department',
}

export const departmentLabel = (code: DepartmentCode) => labels[code]
