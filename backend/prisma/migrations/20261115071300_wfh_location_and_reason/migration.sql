-- AlterTable
ALTER TABLE `attendance` ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `locationAccuracy` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `wfhReason` VARCHAR(500) NULL;
