export const AttendanceEvidenceKind = {
  CHECKIN_WORK_PROOF: 'CHECKIN_WORK_PROOF',
  CHECKIN_SELFIE: 'CHECKIN_SELFIE',
  CHECKOUT_WORK_PROOF: 'CHECKOUT_WORK_PROOF',
  CHECKOUT_SELFIE: 'CHECKOUT_SELFIE',
} as const;

export type AttendanceEvidenceKind =
  (typeof AttendanceEvidenceKind)[keyof typeof AttendanceEvidenceKind];

export const WorkProofType = {
  SCREEN: 'SCREEN',
  WORKSPACE: 'WORKSPACE',
} as const;

export type WorkProofType = (typeof WorkProofType)[keyof typeof WorkProofType];

export interface StagedAttendanceEvidence {
  kind: AttendanceEvidenceKind;
  storageKey: string;
  mimeType: string;
  size: number;
  fingerprint: string;
}
