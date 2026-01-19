import { emailService } from "../src/utils/email.service";
import { env } from "../src/config/env";

const getArgValue = (flag: string): string | undefined => {
  const idx = process.argv.findIndex((a) => a === flag);
  if (idx !== -1) {
    return process.argv[idx + 1];
  }

  const prefix = `${flag}=`;
  const kv = process.argv.find((a) => a.startsWith(prefix));
  if (kv) {
    return kv.slice(prefix.length);
  }

  return undefined;
};

const main = async () => {
  const to =
    getArgValue("--to") ||
    process.env.TEST_EMAIL_TO ||
    process.env.SMTP_TEST_TO ||
    env.ADMIN_EMAIL;

  const subject =
    getArgValue("--subject") ||
    `SMTP Smoke Test - ${new Date().toISOString()}`;

  const dryRun =
    process.argv.includes("--dry-run") ||
    process.argv.includes("--dryrun") ||
    process.argv.includes("--no-send");

  // Redact password; user can still see which account is being used.
  console.log("SMTP config:");
  console.log({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    from: env.EMAIL_FROM,
    adminEmail: env.ADMIN_EMAIL,
    testTo: to,
  });

  const ok = await emailService.verifyConnection();
  if (!ok) {
    console.error("SMTP verify failed. Check SMTP_* and network access.");
    process.exit(1);
  }

  if (dryRun) {
    console.log("Dry run enabled: SMTP verified, email not sent.");
    process.exit(0);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="color:#1e3a8a;">SMTP test email</h2>
      <p>If you received this message, your SMTP configuration is working.</p>
      <hr />
      <p style="color:#6b7280; font-size: 14px;">
        Sent at: ${new Date().toLocaleString()}
      </p>
    </div>
  `;

  const sent = await emailService.sendEmail({
    to,
    subject,
    html,
    text: `SMTP test email\n\nIf you received this message, your SMTP configuration is working.\nSent at: ${new Date().toISOString()}`,
  });

  if (!sent) {
    console.error("SMTP send failed. Check logs for details.");
    process.exit(1);
  }

  console.log("SMTP send OK.");
};

main().catch((err) => {
  console.error("SMTP smoke test crashed:", err);
  process.exit(1);
});
