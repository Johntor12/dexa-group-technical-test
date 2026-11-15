-- Preserve existing employee assignments and attendance snapshots while replacing UUID departments.
SET SESSION sql_mode = CONCAT(@@sql_mode, ',STRICT_ALL_TABLES');

ALTER TABLE `Employee` ADD COLUMN `department` VARCHAR(40) NULL;
ALTER TABLE `Attendance` ADD COLUMN `department` VARCHAR(40) NULL;

UPDATE `Employee` e
JOIN `Department` d ON d.id = e.departmentId
SET e.department = CASE d.name
  WHEN 'Sales' THEN 'SALES'
  WHEN 'Marketing' THEN 'MARKETING'
  WHEN 'Production' THEN 'PRODUCTION'
  WHEN 'Finance' THEN 'FINANCE'
  WHEN 'HR' THEN 'HR'
  WHEN 'Human Resources' THEN 'HR'
  WHEN 'IT' THEN 'IT'
  WHEN 'Engineering' THEN 'IT'
  WHEN 'R&D' THEN 'R_AND_D'
  WHEN 'Logistic' THEN 'LOGISTIC'
  WHEN 'Administration & Secretary' THEN 'ADMINISTRATION_AND_SECRETARY'
  WHEN 'Design Department' THEN 'DESIGN_DEPARTMENT'
  ELSE NULL END;

UPDATE `Attendance`
SET `department` = CASE `departmentName`
  WHEN 'Sales' THEN 'SALES'
  WHEN 'Marketing' THEN 'MARKETING'
  WHEN 'Production' THEN 'PRODUCTION'
  WHEN 'Finance' THEN 'FINANCE'
  WHEN 'HR' THEN 'HR'
  WHEN 'Human Resources' THEN 'HR'
  WHEN 'IT' THEN 'IT'
  WHEN 'Engineering' THEN 'IT'
  WHEN 'R&D' THEN 'R_AND_D'
  WHEN 'Logistic' THEN 'LOGISTIC'
  WHEN 'Administration & Secretary' THEN 'ADMINISTRATION_AND_SECRETARY'
  WHEN 'Design Department' THEN 'DESIGN_DEPARTMENT'
  ELSE NULL END;

-- A missing mapping fails the migration before either legacy column is removed.
CREATE TEMPORARY TABLE `_department_migration_guard` (`value` VARCHAR(40) NOT NULL);
INSERT INTO `_department_migration_guard` SELECT `department` FROM `Employee` WHERE `department` IS NULL;
INSERT INTO `_department_migration_guard` SELECT `department` FROM `Attendance` WHERE `department` IS NULL;
DROP TEMPORARY TABLE `_department_migration_guard`;

ALTER TABLE `Employee` MODIFY `department` ENUM(
  'SALES','MARKETING','PRODUCTION','FINANCE','HR','IT','R_AND_D','LOGISTIC',
  'ADMINISTRATION_AND_SECRETARY','DESIGN_DEPARTMENT'
) NOT NULL;
ALTER TABLE `Attendance` MODIFY `department` ENUM(
  'SALES','MARKETING','PRODUCTION','FINANCE','HR','IT','R_AND_D','LOGISTIC',
  'ADMINISTRATION_AND_SECRETARY','DESIGN_DEPARTMENT'
) NOT NULL;

ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_departmentId_fkey`;
DROP INDEX `Attendance_workDate_departmentId_idx` ON `Attendance`;
ALTER TABLE `Employee` DROP COLUMN `departmentId`;
ALTER TABLE `Attendance` DROP COLUMN `departmentId`, DROP COLUMN `departmentName`;
DROP TABLE `Department`;
CREATE INDEX `Attendance_workDate_department_idx` ON `Attendance`(`workDate`, `department`);
