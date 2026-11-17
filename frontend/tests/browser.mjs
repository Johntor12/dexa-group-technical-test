import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { parse } from "dotenv";
import assert from "node:assert/strict";
import { createDatabase } from "../../backend/dist/libs/common/src/database.js";
import { workDate } from "../../backend/dist/libs/common/src/time.js";
const backend = resolve("../backend");
const settings = parse(await readFile(resolve(backend, ".env.development")));
const developmentDatabase = new URL(settings.DATABASE_URL);
if (!["127.0.0.1", "localhost"].includes(developmentDatabase.hostname))
  throw new Error("Browser tests may only use the local development database.");
process.env.DATABASE_URL = settings.DATABASE_URL;
const env = {
  ...process.env,
  ...settings,
  CORS_ORIGIN: "http://localhost:5174",
  PORT: "4510",
  API_PORT: "4510",
  EMPLOYEE_SERVICE_PORT: "4511",
  ATTENDANCE_SERVICE_PORT: "4512",
};
const children = [];
let logs = "";
function launch(args, cwd, extra = {}) {
  const p = spawn(process.execPath, args, {
    cwd,
    env: { ...env, ...extra },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  p.stdout.on("data", (d) => (logs += d));
  p.stderr.on("data", (d) => (logs += d));
  children.push(p);
}
let browser;
const db = createDatabase();
try {
  for (const service of [
    "employee-service",
    "attendance-service",
    "api-gateway",
  ])
    launch([`dist/apps/${service}/src/main.js`], backend);
  launch(
    [
      "node_modules/webpack-cli/bin/cli.js",
      "serve",
      "--mode",
      "development",
      "--port",
      "5174",
    ],
    process.cwd(),
    { API_URL: "http://localhost:4510/api/v1" },
  );
  // Gateway CORS is configured for this test origin.
  // Override above launch environment consistently with frontend's temporary port.
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch("http://localhost:5174");
      const health = await fetch("http://localhost:4510/health/ready");
      if (r.ok && health.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, "Preview failed: " + logs);
  browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["geolocation"],
    geolocation: { latitude: -6.2, longitude: 106.81667, accuracy: 25 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5174");
  await mkdir("../.local/screenshots", { recursive: true });
  await page.screenshot({
    path: "../.local/screenshots/signin-desktop.png",
    fullPage: true,
  });
  await page
    .getByLabel("Email kantor", { exact: true })
    .fill(settings.SEED_HRD_EMAIL);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill(settings.SEED_PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  console.log("HRD dashboard loaded");
  await page.getByText("Total karyawan", { exact: true }).waitFor();
  await page.getByText("Sudah absen hari ini", { exact: true }).waitFor();
  await page
    .getByText("Belum tercatat (jadwal belum diverifikasi)", { exact: true })
    .waitFor();
  assert.equal(new URL(page.url()).pathname, "/hr");
  await page.getByRole("button", { name: "Profil saya", exact: true }).click();
  await page
    .getByRole("heading", { name: "Profil saya", exact: true, level: 1 })
    .waitFor();
  assert.equal(new URL(page.url()).pathname, "/hr/profile");
  await page.getByRole("button", { name: /Kembali/ }).click();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await page.getByRole("button", { name: "Lihat monitoring" }).click();
  await page
    .getByRole("heading", { name: "Monitor absensi", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Data karyawan", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Tambah karyawan" }).click();
  const id = crypto.randomUUID().slice(0, 8);
  const employeeEmail = `browser-${id}@example.test`;
  const password = "Browser-test-password-2026";
  await page.getByLabel("Nama lengkap").fill("Browser Demo Employee");
  await page.getByLabel("Nomor karyawan").fill(`WEB-${id}`);
  await page.getByLabel("Email", { exact: true }).fill(employeeEmail);
  await page.getByLabel("Jabatan", { exact: true }).fill("Developer");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.getByRole("dialog", { name: "Tautan aktivasi akun" }).waitFor();
  const activationUrl = (
    await page.getByTestId("activation-link").textContent()
  ).trim();
  assert.ok(activationUrl.startsWith("http://localhost:5174/activate/"));
  await page
    .getByRole("dialog", { name: "Tautan aktivasi akun" })
    .getByRole("button", { name: "Tutup" })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Karyawan dan akun berhasil dibuat" })
    .waitFor();
  console.log("HRD employee created");
  await page.getByLabel("Cari", { exact: true }).fill(id);
  await page.getByRole("cell", { name: new RegExp(`WEB-${id}`) }).waitFor();
  await mkdir("../.local/screenshots", { recursive: true });
  await page.screenshot({
    path: "../.local/screenshots/hrd-desktop.png",
    fullPage: true,
  });
  const desktopA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    desktopA11y.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await page.goto(activationUrl);
  await page.getByRole("heading", { name: "Aktivasi akun" }).waitFor();
  await page.getByLabel("Kata sandi baru").fill(password);
  await page.getByLabel("Ulangi kata sandi").fill(password);
  await page.getByRole("button", { name: "Aktifkan akun" }).click();
  await page.getByRole("status").filter({ hasText: "Akun aktif" }).waitFor();
  await page.getByLabel("Email kantor", { exact: true }).fill(employeeEmail);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await page.getByRole("button", { name: "Check-in", exact: true }).click();
  await page
    .getByRole("heading", { name: "Absensi WFH", exact: true })
    .waitFor();
  console.log("Employee live capture screen loaded");
  async function capturePair() {
    await page
      .getByRole("button", { name: "Mulai capture bukti kerja" })
      .click();
    await page.getByRole("button", { name: "Ambil bukti kerja" }).waitFor();
    await page.getByRole("button", { name: "Ambil bukti kerja" }).click();
    await page
      .getByRole("img", { name: "Bukti area kerja yang telah dicapture" })
      .waitFor();
    await page.getByRole("button", { name: "Buka kamera depan" }).click();
    await page.getByRole("button", { name: "Ambil selfie" }).waitFor();
    await page.getByRole("button", { name: "Ambil selfie" }).click();
    await page
      .getByRole("img", { name: "Selfie yang telah dicapture" })
      .waitFor();
  }
  await capturePair();
  await page
    .getByRole("button", { name: "Kirim check-in", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Check-in berhasil", exact: true })
    .waitFor();
  console.log("Employee check-in submitted with live work proof and selfie");
  assert.equal(new URL(page.url()).pathname, "/app/check-in/success");
  await page.getByRole("img", { name: "Bukti kerja saat check-in" }).waitFor();
  await page.getByRole("img", { name: "Selfie saat check-in" }).waitFor();
  await page.getByRole("button", { name: "Ke dashboard", exact: true }).click();
  await page.getByRole("button", { name: "Check-out", exact: true }).click();
  await page
    .getByRole("heading", { name: "Check-out WFH", exact: true })
    .waitFor();
  await capturePair();
  await page
    .getByRole("button", { name: "Kirim check-out", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Check-out berhasil", exact: true })
    .waitFor();
  await page.getByRole("img", { name: "Bukti kerja saat check-out" }).waitFor();
  await page.getByRole("img", { name: "Selfie saat check-out" }).waitFor();
  assert.equal(new URL(page.url()).pathname, "/app/check-out/success");
  await page.getByRole("button", { name: "Lihat Riwayat" }).click();
  assert.equal(new URL(page.url()).pathname, "/app/attendance/history");
  await page.getByRole("button", { name: "Lihat detail" }).first().click();
  await page.getByRole("heading", { name: "Detail sesi WFH" }).waitFor();
  await page.getByRole("img", { name: /Bukti absensi/ }).waitFor();
  await page.getByText("Koordinat perangkat: -6.20000, 106.81667").waitFor();
  await page.getByText("Fokus menyelesaikan laporan dari rumah.").waitFor();
  console.log("Evidence loaded");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../.local/screenshots/employee-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Mobile layout overflows",
  );
  const mobileA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    mobileA11y.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
  console.log("Missed check-in claims are covered by backend integration flow");
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await page
    .getByLabel("Email kantor", { exact: true })
    .fill(settings.SEED_REVIEWER_EMAIL ?? "reviewer@pharmawork.test");
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill(settings.SEED_PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.getByRole("button", { name: "Lihat monitoring" }).click();
  const reviewCard = page
    .locator("article")
    .filter({ hasText: `Browser Demo Employee · ${eligibleDate}` });
  await reviewCard.getByRole("button", { name: "Tinjau" }).click();
  await reviewCard
    .getByRole("button", { name: "Lihat bukti pendukung retroaktif" })
    .click();
  await page.getByRole("img", { name: "Bukti pendukung retroaktif" }).waitFor();
  page.once("dialog", (dialog) => void dialog.accept());
  await reviewCard.getByRole("button", { name: "Setujui" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Koreksi disetujui" })
    .waitFor();
  await db.missedCheckInReviewGrant.delete({ where: { id: reviewerGrant.id } });
  console.log("Missed check-in claim flow covered by backend integration flow");
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await page
    .getByLabel("Email kantor", { exact: true })
    .fill(settings.SEED_HRD_EMAIL);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill(settings.SEED_PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.getByRole("heading", { name: "Sesi WFH terbaru" }).waitFor();
  await page
    .getByRole("img", {
      name: `Bukti area kerja saat check-in oleh Browser Demo Employee`,
    })
    .first()
    .waitFor();
  await page
    .getByRole("button", { name: "Data karyawan", exact: true })
    .click();
  await page.getByLabel("Cari", { exact: true }).fill(id);
  await page
    .getByRole("row")
    .filter({ hasText: `WEB-${id}` })
    .getByRole("button", { name: "Ubah", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Ubah karyawan", level: 1 })
    .waitFor();
  await page.getByLabel("Jabatan", { exact: true }).fill("Senior Developer");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Data karyawan diperbarui" })
    .waitFor();
  await page.getByLabel("Cari", { exact: true }).fill(id);
  await page
    .getByRole("row")
    .filter({ hasText: `WEB-${id}` })
    .getByRole("cell", { name: "Senior Developer" })
    .waitFor();
  await page
    .getByRole("row")
    .filter({ hasText: `WEB-${id}` })
    .getByRole("button", { name: "Nonaktifkan", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Nonaktifkan", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Karyawan dinonaktifkan" })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: HRD dashboard/create/edit/deactivate, employee upload/detail, routing, responsive layout and accessibility.",
  );
} finally {
  if (browser) await browser.close();
  await db.$disconnect();
  for (const p of children) if (p.exitCode === null) p.kill();
}
