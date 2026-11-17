CREATE INDEX `Employee_active_createdAt_idx`
ON `Employee` (`active`, `createdAt`);

CREATE INDEX `Attendance_workDate_submittedAt_idx`
ON `Attendance` (`workDate`, `submittedAt`);

CREATE INDEX `Attendance_workDate_source_checkOutAt_idx`
ON `Attendance` (`workDate`, `source`, `checkOutAt`);
