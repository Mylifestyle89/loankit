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
    console.warn(`[email-service] SMTP not configured — email disabled. host=${!!host} user=${!!user} pass=${!!pass}`);
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  if (process.env.NODE_ENV !== "production") {
    // Mask user to avoid logging credentials in production
    console.log(`[email-service] Initializing SMTP: host=${host} port=${port} user=${user?.slice(0, 3)}***`);
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    logger: true,
    debug: process.env.NODE_ENV !== "production",
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

export type InvoiceDigestItem = {
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  contractNumber?: string | null;
  isOverdue: boolean;
  isSupplement: boolean;
};

export type InvoiceDigestData = {
  customerName: string;
  items: InvoiceDigestItem[];
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

  /** Send ONE digest email containing all due/overdue invoices for a customer. */
  async sendInvoiceDigest(
    to: string,
    data: InvoiceDigestData,
  ): Promise<{ success: boolean; error?: string }> {
    if (!isValidEmail(to)) return { success: false, error: "Invalid email address" };
    if (data.items.length === 0) return { success: false, error: "No items to send" };
    const t = getTransporter();
    if (!t) return { success: false, error: "SMTP not configured" };

    const overdue = data.items.filter((i) => i.isOverdue);
    const dueSoon = data.items.filter((i) => !i.isOverdue);
    const totalAmount = data.items.reduce((s, i) => s + i.amount, 0);

    const rowHtml = (i: InvoiceDigestItem) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd;">${esc(i.invoiceNumber)}${i.isSupplement ? ' <span style="color:#888;font-size:11px;">(cần bổ sung)</span>' : ""}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right;">${fmtVND(i.amount)}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;">${fmtDate(i.dueDate)}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;">${esc(i.contractNumber ?? "—")}</td>
      </tr>`;

    const tableHtml = (title: string, color: string, items: InvoiceDigestItem[]) => items.length === 0 ? "" : `
      <h3 style="color:${color};margin-top:20px;">${title} (${items.length})</h3>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead><tr style="background:#f5f5f5;">
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Số hóa đơn</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:right;">Số tiền (VND)</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Ngày đến hạn</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Hợp đồng</th>
        </tr></thead>
        <tbody>${items.map(rowHtml).join("")}</tbody>
      </table>`;

    const subject = overdue.length > 0
      ? `[CẢNH BÁO] Bạn có ${overdue.length} hóa đơn quá hạn${dueSoon.length > 0 ? ` và ${dueSoon.length} sắp đến hạn` : ""}`
      : `[Nhắc nhở] Bạn có ${dueSoon.length} hóa đơn sắp đến hạn`;

    try {
      await t.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:700px;">
            <h2>Thông báo hóa đơn</h2>
            <p>Khách hàng: <strong>${esc(data.customerName)}</strong></p>
            <p>Tổng số hóa đơn cần xử lý: <strong>${data.items.length}</strong> — Tổng giá trị: <strong>${fmtVND(totalAmount)} VND</strong></p>
            ${tableHtml("Hóa đơn quá hạn", "#d32f2f", overdue)}
            ${tableHtml("Hóa đơn sắp đến hạn", "#f57c00", dueSoon)}
            <hr style="margin-top:24px;"/>
            <p style="color:#888;font-size:12px;">Email tự động — vui lòng không trả lời.</p>
          </div>
        `,
      });
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[email-service] sendInvoiceDigest error:", msg);
      return { success: false, error: msg };
    }
  },
};
