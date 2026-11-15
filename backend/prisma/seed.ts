import 'dotenv/config';
import { hash } from 'bcryptjs';
import { createDatabase } from '../libs/common/src/database.js';
import { required } from '../libs/common/src/config.js';
import { workDate } from '../libs/common/src/time.js';
const db = createDatabase();
try {
  const password = required('SEED_PASSWORD');
  if (password.length < 12 || Buffer.byteLength(password) > 72)
    throw new Error('SEED_PASSWORD must be 12–72 bytes');
  const passwordHash = await hash(password, 12);
  await db.user.upsert({
    where: { email: required('SEED_HRD_EMAIL') },
    update: {},
    create: { email: required('SEED_HRD_EMAIL'), passwordHash, role: 'HRD' },
  });
  const demo = await db.user.upsert({
    where: { email: required('SEED_EMPLOYEE_EMAIL') },
    update: {},
    create: {
      email: required('SEED_EMPLOYEE_EMAIL'), passwordHash,
      employee: { create: { employeeNumber: 'DEMO-001', fullName: 'Demo Employee', position: 'Developer', department: 'IT' } },
    },
    include: { employee: true },
  });
  const reviewerEmail = process.env.SEED_REVIEWER_EMAIL ?? 'reviewer@pharmawork.test';
  const reviewer = await db.user.upsert({
    where: { email: reviewerEmail }, update: {},
    create: { email: reviewerEmail, passwordHash, role: 'HRD' },
  });
  await db.correctionReviewGrant.upsert({
    where: { userId_department_permission: { userId: reviewer.id, department: 'IT', permission: 'ATTENDANCE_CORRECTION_REVIEW' } },
    update: {}, create: { userId: reviewer.id, department: 'IT' },
  });
  if (demo.employee) {
    const date = workDate(new Date(Date.now() - 2 * 86400000));
    await db.correctionEligibleDay.upsert({
      where: { employeeId_workDate: { employeeId: demo.employee.id, workDate: date } },
      update: {}, create: { employeeId: demo.employee.id, workDate: date, note: 'Synthetic demo WFH eligibility' },
    });
  }
  console.log(
    'Synthetic demo users seeded. Existing accounts were not modified.',
  );
} finally {
  await db.$disconnect();
}
