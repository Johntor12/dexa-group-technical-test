ALTER TABLE `AttendanceCorrectionRequest` ADD COLUMN `priorRejectedRequestId` CHAR(36) NULL;
CREATE INDEX `AttendanceCorrectionRequest_priorRejectedRequestId_idx` ON `AttendanceCorrectionRequest` (`priorRejectedRequestId`);
ALTER TABLE `AttendanceCorrectionRequest` ADD CONSTRAINT `AttendanceCorrectionRequest_priorRejectedRequestId_fkey` FOREIGN KEY (`priorRejectedRequestId`) REFERENCES `AttendanceCorrectionRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
