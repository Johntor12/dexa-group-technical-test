-- Keep historical attendance rows while removing the old correction request subsystem.
-- Rows created by the old correction workflow remain attendance records with a neutral source.
UPDATE `Attendance` SET `source` = 'DIRECT' WHERE `source` = 'CORRECTION';

-- TiDB requires the foreign key and its backing unique index to be dropped separately.
ALTER TABLE `Attendance` DROP FOREIGN KEY `Attendance_correctionRequestId_fkey`;
ALTER TABLE `Attendance` DROP INDEX `Attendance_correctionRequestId_key`;
ALTER TABLE `Attendance` DROP COLUMN `correctionRequestId`;

DROP TABLE `AttendanceCorrectionEvidence`;
DROP TABLE `CorrectionEligibleDay`;
DROP TABLE `AttendanceCorrectionRequest`;

RENAME TABLE `CorrectionReviewGrant` TO `MissedCheckInReviewGrant`;
UPDATE `MissedCheckInReviewGrant`
  SET `permission` = 'MISSED_CHECK_IN_CLAIM_REVIEW'
  WHERE `permission` = 'ATTENDANCE_CORRECTION_REVIEW';
ALTER TABLE `MissedCheckInReviewGrant`
  ALTER COLUMN `permission` SET DEFAULT 'MISSED_CHECK_IN_CLAIM_REVIEW';
ALTER TABLE `MissedCheckInReviewGrant`
  RENAME INDEX `CorrectionReviewGrant_userId_department_permission_key` TO `MissedCheckInReviewGrant_userId_department_permission_key`;
ALTER TABLE `MissedCheckInReviewGrant` DROP FOREIGN KEY `CorrectionReviewGrant_userId_fkey`;
ALTER TABLE `MissedCheckInReviewGrant`
  ADD CONSTRAINT `MissedCheckInReviewGrant_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Attendance` MODIFY `source` ENUM('DIRECT','MISSED_CHECK_IN_CLAIM') NOT NULL DEFAULT 'DIRECT';
UPDATE `MissedCheckInClaim` SET `status` = 'REJECTED' WHERE `status` = 'CANCELLED';
ALTER TABLE `MissedCheckInClaim` MODIFY `status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING';
