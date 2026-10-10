import nodemailer from "nodemailer";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

export type EmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

/** Send mail using EMAIL_DRIVER=console (default) or EMAIL_DRIVER=smtp. */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  try {
    const driver = process.env.EMAIL_DRIVER ?? "console";

    if (driver === "console") {
      console.info("[email:console]", {
        from: process.env.EMAIL_FROM ?? "Nexus <no-reply@nexus.test>",
        ...message,
      });
      return { ok: true, messageId: `console-${Date.now()}` };
    }

    if (driver !== "smtp") {
      return { ok: false, error: `Unsupported EMAIL_DRIVER: ${driver}` };
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM;
    if (!host || !Number.isFinite(port) || port <= 0 || !user || !pass || !from) {
      return { ok: false, error: "SMTP requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM" };
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    const sent = await transport.sendMail({ ...message, from });
    return { ok: true, messageId: sent.messageId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
