import 'dotenv/config';
import { hash } from 'bcryptjs';
import { createDatabase } from '../libs/common/src/database.js';
import { required } from '../libs/common/src/config.js';
import { departmentNumber } from '../libs/contracts/src/department.js';

const db = createDatabase();
const employeeSeeds = [
  { email: 'employee.sales01@pharmawork.test', fullName: 'Raka Pratama', department: 'SALES', position: 'Sales Executive' },
  { email: 'employee.marketing01@pharmawork.test', fullName: 'Nadia Putri', department: 'MARKETING', position: 'Marketing Specialist' },
  { email: 'employee.production01@pharmawork.test', fullName: 'Dimas Saputra', department: 'PRODUCTION', position: 'Production Operator' },
  { email: 'employee.finance01@pharmawork.test', fullName: 'Intan Permata', department: 'FINANCE', position: 'Finance Analyst' },
  { email: 'employee.hr01@pharmawork.test', fullName: 'Citra Ayuningtyas', department: 'HR', position: 'HR Officer' },
  { email: required('SEED_EMPLOYEE_EMAIL'), fullName: 'Bima Aditya', department: 'IT', position: 'Software Engineer' },
  { email: 'employee.rnd01@pharmawork.test', fullName: 'Salsabila Rahma', department: 'R_AND_D', position: 'Research Associate' },
  { email: 'employee.logistic01@pharmawork.test', fullName: 'Fajar Hidayat', department: 'LOGISTIC', position: 'Logistics Coordinator' },
  { email: 'employee.admin.secretary01@pharmawork.test', fullName: 'Maya Lestari', department: 'ADMINISTRATION_AND_SECRETARY', position: 'Administrative Secretary' },
  { email: 'employee.design01@pharmawork.test', fullName: 'Rangga Mahendra', department: 'DESIGN_DEPARTMENT', position: 'Graphic Designer' },
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
    update: { role: 'HRD', active: true, passwordHash },
    create: { email: hrdEmail, passwordHash, role: 'HRD' },
  });

  for (const employee of employeeSeeds) {
    const existing = await db.user.findUnique({
      where: { email: employee.email },
      include: { employee: true },
    });
    let user;
    if (existing?.employee) {
      user = await db.user.update({
        where: { id: existing.id },
        data: {
          role: 'EMPLOYEE',
          active: true,
          passwordHash,
          employee: {
            update: {
              fullName: employee.fullName,
              position: employee.position,
              department: employee.department,
              active: true,
            },
          },
        },
        include: { employee: true },
      });
    } else {
      user = await db.$transaction(async (tx) => {
        const sequence = await tx.employeeNumberSequence.create({ data: {} });
        const year = new Intl.DateTimeFormat('en', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
        }).format(new Date());
        if (sequence.id > 9999) {
          throw new Error('The four-digit company-wide employee number sequence is exhausted.');
        }
        const employeeNumber = `DEXA-${year}-${departmentNumber[employee.department]}-${String(sequence.id).padStart(4, '0')}`;
        const employeeData = {
          employeeNumber,
          fullName: employee.fullName,
          position: employee.position,
          department: employee.department,
        };
        if (existing) {
          return tx.user.update({
            where: { id: existing.id },
            data: {
              role: 'EMPLOYEE',
              active: true,
              passwordHash,
              employee: { create: employeeData },
            },
            include: { employee: true },
          });
        }
        return tx.user.create({
          data: {
            email: employee.email,
            passwordHash,
            role: 'EMPLOYEE',
            employee: { create: employeeData },
          },
          include: { employee: true },
        });
      });
    }
  }

  const reviewer = await db.user.upsert({
    where: { email: reviewerEmail },
    update: { role: 'HRD', active: true, passwordHash },
    create: { email: reviewerEmail, passwordHash, role: 'HRD' },
  });
  await db.missedCheckInReviewGrant.deleteMany({
    where: { userId: reviewer.id, permission: 'MISSED_CHECK_IN_CLAIM_REVIEW', department: { not: 'IT' } },
  });
  await db.missedCheckInReviewGrant.upsert({
    where: {
      userId_department_permission: {
        userId: reviewer.id,
        department: 'IT',
        permission: 'MISSED_CHECK_IN_CLAIM_REVIEW',
      },
    },
    update: {},
    create: { userId: reviewer.id, department: 'IT' },
  });

  console.log(`Seeded 1 HRD administrator, 1 IT claim reviewer, and ${employeeSeeds.length} employee accounts with synthetic names.`);
} finally {
  await db.$disconnect();
}
