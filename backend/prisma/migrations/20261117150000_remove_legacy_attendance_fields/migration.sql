-- Direct attendance and missed-check-in claim flows no longer collect task descriptions or WFH reasons.
ALTER TABLE `Attendance` DROP COLUMN `taskDescription`;
ALTER TABLE `Attendance` DROP COLUMN `wfhReason`;
ALTER TABLE `MissedCheckInClaim` DROP COLUMN `taskDescription`;
