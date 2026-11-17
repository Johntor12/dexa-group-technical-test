import { createHash } from 'node:crypto';
import { fail } from './errors.js';
import { PhotoStorage } from './storage.js';
import {
  AttendanceEvidenceKind as EvidenceKind,
  type StagedAttendanceEvidence,
} from '../../contracts/src/attendance-evidence.js';

export interface AttendanceCaptureFile {
  buffer: Buffer;
  mimetype: string;
}

type CaptureFiles = {
  workProof?: AttendanceCaptureFile[];
  selfie?: AttendanceCaptureFile[];
};

export async function stageAttendanceCapturePair(
  storage: PhotoStorage,
  files: CaptureFiles,
  event: 'CHECKIN' | 'CHECKOUT',
): Promise<StagedAttendanceEvidence[]> {
  const workProof = files.workProof?.[0];
  const selfie = files.selfie?.[0];
  if (!workProof || !selfie)
    fail(400, 'CAPTURE_PAIR_REQUIRED', 'Capture both work proof and selfie.');

  const staged: StagedAttendanceEvidence[] = [];
  try {
    const work = await storage.stage(workProof.buffer, workProof.mimetype);
    staged.push({
      kind:
        event === 'CHECKIN'
          ? EvidenceKind.CHECKIN_WORK_PROOF
          : EvidenceKind.CHECKOUT_WORK_PROOF,
      ...work,
    });
    const face = await storage.stage(selfie.buffer, selfie.mimetype);
    staged.push({
      kind:
        event === 'CHECKIN'
          ? EvidenceKind.CHECKIN_SELFIE
          : EvidenceKind.CHECKOUT_SELFIE,
      ...face,
    });
    return staged.map((item) => ({ ...item }));
  } catch (error) {
    await Promise.all(staged.map((item) => storage.remove(item.storageKey).catch(() => undefined)));
    throw error;
  }
}

export function captureFingerprint(evidence: StagedAttendanceEvidence[]) {
  const canonical = [...evidence]
    .sort((a, b) => a.kind.localeCompare(b.kind))
    .map(({ kind, fingerprint }) => `${kind}:${fingerprint}`)
    .join('|');
  return createHash('sha256').update(canonical).digest('hex');
}

export async function removeStagedCaptures(
  storage: PhotoStorage,
  evidence: StagedAttendanceEvidence[],
) {
  await Promise.all(evidence.map((item) => storage.remove(item.storageKey)));
}

