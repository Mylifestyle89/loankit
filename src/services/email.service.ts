import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/** Lazy-init singleton transporter — won't crash if SMTP not configured */
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("[email-service] SMTP not configured — email disabled.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  });

  return transporter;
}

type InvoiceEmailData = {
  customerName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  contractNumber?: string;
};

/** Escape HTML to prevent XSS */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Format VND amount */
function fmtVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

/** Format date dd/MM/yyyy */
function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Basic email format check to prevent SMTP header injection */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes("\n") && !email.includes("\r");
}

export const emailService = {
  /** Send invoice due-soon reminder email */
  async sendInvoiceReminder(
    to: string,
    data: InvoiceEmailData,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isValidEmail(to)) return { success: false, error: "Invalid email address" };
    const t = getTransporter();
    if (!t) return { success: false, error: "SMTP not configured" };

    try {
      await t.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject: `[Nhac nho] Hoa don ${data.invoiceNumber} sap den han`,
        html: `
          <h3>Nhac nho hoa don sap den han</h3>
          <p><strong>Khach hang:</strong> ${esc(data.customerName)}</p>
          <p><strong>So hoa don:</strong> ${esc(data.invoiceNumber)}</p>
          <p><strong>So tien:</strong> ${fmtVND(data.amount)} VND</p>
          <p><strong>Ngay den han:</strong> ${fmtDate(data.dueDate)}</p>
          ${data.contractNumber ? `<p><strong>Hop dong:</strong> ${esc(data.contractNumber)}</p>` : ""}
          <hr/>
          <p style="color:#888;font-size:12px;">Email tu dong — vui long khong tra loi.</p>
        `,
      });
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[email-service] sendInvoiceReminder error:", msg);
      return { success: false, error: msg };
    }
  },

  /** Send invoice overdue warning email */
  async sendInvoiceOverdue(
    to: string,
    data: InvoiceEmailData,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isValidEmail(to)) return { success: false, error: "Invalid email address" };
    const t = getTransporter();
    if (!t) return { success: false, error: "SMTP not configured" };

    try {
      await t.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject: `[CANH BAO] Hoa don ${data.invoiceNumber} da qua han`,
        html: `
          <h3 style="color:red;">Canh bao: Hoa don qua han</h3>
          <p><strong>Khach hang:</strong> ${esc(data.customerName)}</p>
          <p><strong>So hoa don:</strong> ${esc(data.invoiceNumber)}</p>
          <p><strong>So tien:</strong> ${fmtVND(data.amount)} VND</p>
          <p><strong>Ngay den han:</strong> ${fmtDate(data.dueDate)}</p>
          ${data.contractNumber ? `<p><strong>Hop dong:</strong> ${esc(data.contractNumber)}</p>` : ""}
          <p style="color:red;"><strong>Hoa don nay da qua han thanh toan. Vui long xu ly ngay.</strong></p>
          <hr/>
          <p style="color:#888;font-size:12px;">Email tu dong — vui long khong tra loi.</p>
        `,
      });
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[email-service] sendInvoiceOverdue error:", msg);
      return { success: false, error: msg };
    }
  },
};
