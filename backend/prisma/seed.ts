import 'dotenv/config';
import { hash } from 'bcryptjs';
import { createDatabase } from '../libs/common/src/database.js';
import { required } from '../libs/common/src/config.js';
import { workDate } from '../libs/common/src/time.js';

const db = createDatabase();
const employeeSeeds = [
  { email: 'employee.sales01@pharmawork.test', employeeNumber: 'PW-SLS-001', fullName: 'Raka Pratama', department: 'SALES', position: 'Sales Executive' },
  { email: 'employee.marketing01@pharmawork.test', employeeNumber: 'PW-MKT-001', fullName: 'Nadia Putri', department: 'MARKETING', position: 'Marketing Specialist' },
  { email: 'employee.production01@pharmawork.test', employeeNumber: 'PW-PRD-001', fullName: 'Dimas Saputra', department: 'PRODUCTION', position: 'Production Operator' },
  { email: 'employee.finance01@pharmawork.test', employeeNumber: 'PW-FIN-001', fullName: 'Intan Permata', department: 'FINANCE', position: 'Finance Analyst' },
  { email: 'employee.hr01@pharmawork.test', employeeNumber: 'PW-HR-001', fullName: 'Citra Ayuningtyas', department: 'HR', position: 'HR Officer' },
  { email: required('SEED_EMPLOYEE_EMAIL'), employeeNumber: 'PW-IT-001', fullName: 'Bima Aditya', department: 'IT', position: 'Software Engineer' },
  { email: 'employee.rnd01@pharmawork.test', employeeNumber: 'PW-RND-001', fullName: 'Salsabila Rahma', department: 'R_AND_D', position: 'Research Associate' },
  { email: 'employee.logistic01@pharmawork.test', employeeNumber: 'PW-LOG-001', fullName: 'Fajar Hidayat', department: 'LOGISTIC', position: 'Logistics Coordinator' },
  { email: 'employee.admin.secretary01@pharmawork.test', employeeNumber: 'PW-ADM-001', fullName: 'Maya Lestari', department: 'ADMINISTRATION_AND_SECRETARY', position: 'Administrative Secretary' },
  { email: 'employee.design01@pharmawork.test', employeeNumber: 'PW-DES-001', fullName: 'Rangga Mahendra', department: 'DESIGN_DEPARTMENT', position: 'Graphic Designer' },
] as const;

async function moveLegacySeedAccount(oldEmail: string, newEmail: string) {
  if (oldEmail === newEmail) return;
  const oldUser = await db.user.findUnique({ where: { email: oldEmail }, select: { id: true } });
  if (!oldUser) return;
  const newUser = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (newUser && newUser.id !== oldUser.id) {
    throw new Error(`Both legacy and replacement seed accounts exist for ${newEmail}; resolve the duplicate before seeding.`);
  }
  await db.$transaction(async tx => {
    await tx.session.updateMany({ where: { userId: oldUser.id, revoked: false }, data: { revoked: true } });
    if (!newUser) await tx.user.update({ where: { id: oldUser.id }, data: { email: newEmail } });
  });
}

try {
  const password = required('SEED_PASSWORD');
  if (password.length < 12 || Buffer.byteLength(password) > 72)
    throw new Error('SEED_PASSWORD must be 12–72 bytes');
  const passwordHash = await hash(password, 12);
  const hrdEmail = required('SEED_HRD_EMAIL');
  const employeeEmail = required('SEED_EMPLOYEE_EMAIL');
  const reviewerEmail = process.env.SEED_REVIEWER_EMAIL ?? 'hrd.reviewer.it01@pharmawork.test';

  // Rename only the three known seed identities, preserving their IDs and audit relations.
  await moveLegacySeedAccount('hrd@example.test', hrdEmail);
  await moveLegacySeedAccount('employee@example.test', employeeEmail);
  await moveLegacySeedAccount('reviewer@pharmawork.test', reviewerEmail);

  await db.user.upsert({
    where: { email: hrdEmail },
    update: { role: 'HRD', active: true },
    create: { email: hrdEmail, passwordHash, role: 'HRD' },
  });

  let seededItEmployeeId = '';
  for (const employee of employeeSeeds) {
    const user = await db.user.upsert({
      where: { email: employee.email },
      update: {
        role: 'EMPLOYEE',
        active: true,
        employee: {
          upsert: {
            create: { employeeNumber: employee.employeeNumber, fullName: employee.fullName, position: employee.position, department: employee.department },
            update: { employeeNumber: employee.employeeNumber, fullName: employee.fullName, position: employee.position, department: employee.department, active: true },
          },
        },
      },
      create: {
        email: employee.email,
        passwordHash,
        role: 'EMPLOYEE',
        employee: {
          create: { employeeNumber: employee.employeeNumber, fullName: employee.fullName, position: employee.position, department: employee.department },
        },
      },
      include: { employee: true },
    });
    if (employee.department === 'IT') seededItEmployeeId = user.employee!.id;
  }

  const reviewer = await db.user.upsert({
    where: { email: reviewerEmail },
    update: { role: 'HRD', active: true },
    create: { email: reviewerEmail, passwordHash, role: 'HRD' },
  });
  await db.correctionReviewGrant.deleteMany({
    where: { userId: reviewer.id, permission: 'ATTENDANCE_CORRECTION_REVIEW', department: { not: 'IT' } },
  });
  await db.correctionReviewGrant.upsert({
    where: {
      userId_department_permission: {
        userId: reviewer.id,
        department: 'IT',
        permission: 'ATTENDANCE_CORRECTION_REVIEW',
      },
    },
    update: {},
    create: { userId: reviewer.id, department: 'IT' },
  });

  const date = workDate(new Date(Date.now() - 2 * 86400000));
  await db.correctionEligibleDay.upsert({
    where: { employeeId_workDate: { employeeId: seededItEmployeeId, workDate: date } },
    update: {},
    create: { employeeId: seededItEmployeeId, workDate: date, note: 'Synthetic demo WFH eligibility' },
  });

  console.log(`Seeded 1 HRD administrator, 1 IT reviewer, and ${employeeSeeds.length} employee accounts with synthetic names.`);
} finally {
  await db.$disconnect();
}
