ALTER TABLE `Attendance`
ADD COLUMN `activityDescription` TEXT NULL;

CREATE TABLE `MissedCheckInClaimEvidence` (
    `id` CHAR(36) NOT NULL,
    `claimId` CHAR(36) NOT NULL,
    `storageKey` CHAR(36) NOT NULL,
    `mimeType` VARCHAR(50) NOT NULL,
    `size` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `MissedCheckInClaimEvidence_claimId_key` (`claimId`),
    UNIQUE INDEX `MissedCheckInClaimEvidence_storageKey_key` (`storageKey`),
    PRIMARY KEY (`id`),
    CONSTRAINT `MissedCheckInClaimEvidence_claimId_fkey`
        FOREIGN KEY (`claimId`) REFERENCES `MissedCheckInClaim` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
