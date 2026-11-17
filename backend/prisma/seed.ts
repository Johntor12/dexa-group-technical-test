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
  { email: 'employee.sales02@pharmawork.test', fullName: 'Aditya Nugraha', department: 'SALES', position: 'Key Account Executive' },
  { email: 'employee.sales03@pharmawork.test', fullName: 'Shinta Maharani', department: 'SALES', position: 'Sales Representative' },
  { email: 'employee.sales04@pharmawork.test', fullName: 'Bagas Wicaksono', department: 'SALES', position: 'Sales Operations Associate' },
  { email: 'employee.marketing02@pharmawork.test', fullName: 'Dewi Anggraini', department: 'MARKETING', position: 'Digital Marketing Specialist' },
  { email: 'employee.marketing03@pharmawork.test', fullName: 'Rizky Firmansyah', department: 'MARKETING', position: 'Brand Associate' },
  { email: 'employee.marketing04@pharmawork.test', fullName: 'Putri Anindya', department: 'MARKETING', position: 'Content Strategist' },
  { email: 'employee.production02@pharmawork.test', fullName: 'Yoga Prasetyo', department: 'PRODUCTION', position: 'Production Supervisor' },
  { email: 'employee.production03@pharmawork.test', fullName: 'Laras Wulandari', department: 'PRODUCTION', position: 'Quality Control Analyst' },
  { email: 'employee.production04@pharmawork.test', fullName: 'Ilham Kurniawan', department: 'PRODUCTION', position: 'Production Technician' },
  { email: 'employee.finance02@pharmawork.test', fullName: 'Nabila Safitri', department: 'FINANCE', position: 'Accounts Payable Officer' },
  { email: 'employee.finance03@pharmawork.test', fullName: 'Rendi Setiawan', department: 'FINANCE', position: 'Financial Reporting Analyst' },
  { email: 'employee.finance04@pharmawork.test', fullName: 'Ayu Kusuma', department: 'FINANCE', position: 'Payroll Specialist' },
  { email: 'employee.hr02@pharmawork.test', fullName: 'Farhan Maulana', department: 'HR', position: 'Talent Acquisition Specialist' },
  { email: 'employee.hr03@pharmawork.test', fullName: 'Melati Puspita', department: 'HR', position: 'People Operations Associate' },
  { email: 'employee.hr04@pharmawork.test', fullName: 'Arif Rahman', department: 'HR', position: 'Learning and Development Officer' },
  { email: 'employee.it02@pharmawork.test', fullName: 'Vina Oktaviani', department: 'IT', position: 'Systems Analyst' },
  { email: 'employee.it03@pharmawork.test', fullName: 'Kevin Santoso', department: 'IT', position: 'Infrastructure Engineer' },
  { email: 'employee.it04@pharmawork.test', fullName: 'Dian Pertiwi', department: 'IT', position: 'Application Support Engineer' },
  { email: 'employee.rnd02@pharmawork.test', fullName: 'Fikri Ramadhan', department: 'R_AND_D', position: 'Laboratory Analyst' },
  { email: 'employee.rnd03@pharmawork.test', fullName: 'Anisa Maharani', department: 'R_AND_D', position: 'Product Development Associate' },
  { email: 'employee.rnd04@pharmawork.test', fullName: 'Gilang Permana', department: 'R_AND_D', position: 'Research Scientist' },
  { email: 'employee.logistic02@pharmawork.test', fullName: 'Tika Amelia', department: 'LOGISTIC', position: 'Inventory Controller' },
  { email: 'employee.logistic03@pharmawork.test', fullName: 'Hendra Gunawan', department: 'LOGISTIC', position: 'Distribution Planner' },
  { email: 'employee.logistic04@pharmawork.test', fullName: 'Siti Rahmawati', department: 'LOGISTIC', position: 'Warehouse Coordinator' },
  { email: 'employee.admin.secretary02@pharmawork.test', fullName: 'Andi Kurnia', department: 'ADMINISTRATION_AND_SECRETARY', position: 'Office Administrator' },
  { email: 'employee.admin.secretary03@pharmawork.test', fullName: 'Eka Novitasari', department: 'ADMINISTRATION_AND_SECRETARY', position: 'Executive Secretary' },
  { email: 'employee.admin.secretary04@pharmawork.test', fullName: 'Budi Hartono', department: 'ADMINISTRATION_AND_SECRETARY', position: 'Document Control Officer' },
  { email: 'employee.design02@pharmawork.test', fullName: 'Cindy Amelia', department: 'DESIGN_DEPARTMENT', position: 'Visual Designer' },
  { email: 'employee.design03@pharmawork.test', fullName: 'Reza Pahlevi', department: 'DESIGN_DEPARTMENT', position: 'Packaging Designer' },
  { email: 'employee.design04@pharmawork.test', fullName: 'Nina Kartika', department: 'DESIGN_DEPARTMENT', position: 'Creative Designer' },
] as const;

try {
  const password = required('SEED_PASSWORD');
  if (password.length < 12 || Buffer.byteLength(password) > 72)
    throw new Error('SEED_PASSWORD must be 12–72 bytes');
  const passwordHash = await hash(password, 12);
  const hrdEmail = required('SEED_HRD_EMAIL');
  const employeeEmail = required('SEED_EMPLOYEE_EMAIL');
  const reviewerEmail = process.env.SEED_REVIEWER_EMAIL ?? 'hrd.reviewer.it01@pharmawork.test';

  await db.user.upsert({
    where: { email: hrdEmail },
    update: {},
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
        const lastSequence = await tx.employeeNumberSequence.aggregate({ _max: { id: true } });
        let sequenceNumber = (lastSequence._max.id ?? 0) + 1;
        let allocated = false;
        while (sequenceNumber <= 9999) {
          const inserted = await tx.$executeRaw`
            INSERT IGNORE INTO \`EmployeeNumberSequence\` (\`id\`, \`createdAt\`)
            VALUES (${sequenceNumber}, NOW())
          `;
          if (inserted === 1) {
            allocated = true;
            break;
          }
          sequenceNumber += 1;
        }
        const year = new Intl.DateTimeFormat('en', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
        }).format(new Date());
        if (!allocated) {
          throw new Error('The four-digit company-wide employee number sequence is exhausted.');
        }
        const employeeNumber = `DEXA-${year}-${departmentNumber[employee.department]}-${String(sequenceNumber).padStart(4, '0')}`;
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
    update: {},
    create: { email: reviewerEmail, passwordHash, role: 'HRD' },
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
