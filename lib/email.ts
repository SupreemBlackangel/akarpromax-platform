import { renderEmail, type EmailKind, type EmailVariables, type Locale } from "@/lib/email/templates";

export type EmailSendResult = { ok: boolean; messageId: string };

export interface EmailTransport {
  send(params: { to: string; subject: string; html: string; text: string }): Promise<EmailSendResult>;
}

export type CapturedEmail = { to: string; subject: string; html: string; text: string; messageId: string; provider: string };

export class ConsoleEmailTransport implements EmailTransport {
  public captured: CapturedEmail[] = [];
  private counter = 0;

  async send(params: { to: string; subject: string; html: string; text: string }): Promise<EmailSendResult> {
    const messageId = `console.${process.pid}.${++this.counter}@akarpromax.local`;
    const record: CapturedEmail = { ...params, messageId, provider: "console" };
    this.captured.push(record);
    console.info(`[email:console] to=${params.to} subject="${params.subject}" messageId=${messageId}`);
    return { ok: true, messageId };
  }

  resetCaptured(): void {
    this.captured = [];
    this.counter = 0;
  }

  lastEmail(): CapturedEmail | undefined {
    return this.captured[this.captured.length - 1];
  }
}

export class SmtpEmailTransport implements EmailTransport {
  private host: string;
  private port: number;
  private secure: boolean;
  private user?: string;
  private pass?: string;
  private from: string;
  private ready: Promise<void>;

  constructor(opts: { host: string; port: number; secure: boolean; from: string; user?: string; pass?: string }) {
    this.host = opts.host;
    this.port = opts.port;
    this.secure = opts.secure;
    this.from = opts.from;
    this.user = opts.user;
    this.pass = opts.pass;
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const mod = await import("nodemailer");
    if (!mod || typeof mod.createTransport !== "function") {
      throw new Error("EMAIL_SERVICE_CONFIG_ERROR: nodemailer is installed but createTransport is unavailable");
    }
  }

  async send(params: { to: string; subject: string; html: string; text: string }): Promise<EmailSendResult> {
    await this.ready;
    const mod = await import("nodemailer");
    const transporter = mod.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: this.user && this.pass ? { user: this.user, pass: this.pass } : undefined,
    });
    const info = await transporter.sendMail({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    const messageId = typeof info.messageId === "string" ? info.messageId : `smtp.${Date.now()}`;
    return { ok: true, messageId };
  }
}

export type EmailServiceConfig = {
  transport: EmailTransport;
  defaultLocale: Locale;
  defaultBrand: { title: string; url: string };
  resetUrl?: string;
};

let injectedTransport: EmailTransport | null = null;
let consoleTransportSingleton: ConsoleEmailTransport | null = null;

export function setTransportForTests(transport: EmailTransport | null): void {
  injectedTransport = transport;
}

export function getConsoleTransport(): ConsoleEmailTransport {
  if (!consoleTransportSingleton) consoleTransportSingleton = new ConsoleEmailTransport();
  return consoleTransportSingleton;
}

function resolveTransport(): EmailTransport {
  if (injectedTransport) return injectedTransport;
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    return new SmtpEmailTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
      from: process.env.SMTP_FROM ?? "no-reply@akarpromax.om",
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    });
  }
  return getConsoleTransport();
}

export function createEmailService(overrides: Partial<EmailServiceConfig> = {}): EmailService {
  return new EmailService({
    transport: overrides.transport ?? resolveTransport(),
    defaultLocale: overrides.defaultLocale ?? "ar",
    defaultBrand: overrides.defaultBrand ?? { title: "AkarProMax", url: "https://akarpromax.om" },
    resetUrl: overrides.resetUrl,
  });
}

export class EmailService {
  private transport: EmailTransport;
  private defaultLocale: Locale;
  private defaultBrand: { title: string; url: string };
  private resetUrl: string | undefined;

  constructor(config: EmailServiceConfig) {
    this.transport = config.transport;
    this.defaultLocale = config.defaultLocale;
    this.defaultBrand = config.defaultBrand;
    this.resetUrl = config.resetUrl;
  }

  async send(
    kind: EmailKind,
    params: { to: string; locale?: Locale; variables?: Partial<EmailVariables>; urls?: Record<string, string | number | undefined> },
  ): Promise<EmailSendResult> {
    const locale = params.locale ?? this.defaultLocale;
    const variables: EmailVariables = {
      brandTitle: this.defaultBrand.title,
      brandUrl: this.defaultBrand.url,
      ...params.variables,
    };
    const rendered = renderEmail(locale, kind, variables, params.urls as { verificationUrl?: string; otpExpirySeconds?: number; tokenExpiryMinutes?: number; resetUrl?: string });
    const to = params.to;
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return { ok: false, messageId: "" };
    }
    return this.transport.send({ to, subject: rendered.subject, html: rendered.html, text: rendered.text });
  }

  getTransport(): EmailTransport {
    return this.transport;
  }
}

export const emailService = createEmailService();
