import { renderEmail, type EmailKind, type EmailVariables, type Locale } from "@/lib/email/templates";

export type EmailSendResult = { ok: boolean; messageId: string };

export type EmailRuntimeStatus = {
  transport: "console" | "smtp";
  configured: boolean;
  senderConfigured: boolean;
  publicBaseUrlConfigured: boolean;
  productionCapable: boolean;
};

export type EmailFailureCategory = "auth" | "timeout" | "connection" | "refused" | "protocol" | "rejected" | "config";

export type TransportTestResult = { ok: boolean; category?: EmailFailureCategory | "console"; message?: string };

/**
 * Sanitized delivery failure. The message never contains credentials, tokens,
 * authorization headers or stack traces; operational consumers may read
 * `category`/`code` for safe telemetry.
 */
export class EmailDeliveryError extends Error {
  readonly category: EmailFailureCategory;
  readonly code?: string;

  constructor(category: EmailFailureCategory, message: string, raw?: unknown) {
    super(message);
    this.name = "EmailDeliveryError";
    this.category = category;
    const rawCode = raw instanceof Error ? (raw as Error & { code?: unknown }).code : undefined;
    if (typeof rawCode === "string" && /^[A-Z]{2,16}$/.test(rawCode)) this.code = rawCode;
  }
}

const SAFE_SMTP_CODE = /^E[A-Z]{2,14}$/;

const SMTP_CATEGORY_BY_CODE: Record<string, EmailFailureCategory> = {
  EAUTH: "auth",
  EAUTHPLAIN: "auth",
  ECONNREFUSED: "refused",
  ETIMEDOUT: "timeout",
  ESOCKET: "connection",
  ECONNECTION: "connection",
  EDNS: "connection",
  ESMTPBANNER: "connection",
  ESMTPGREETING: "connection",
  ETLS: "connection",
  EPROTOCOL: "protocol",
};

export function sanitizeSmtpError(error: unknown): EmailDeliveryError {
  const raw = error instanceof Error ? error : new Error(String(error));
  const code = typeof (raw as Error & { code?: unknown }).code === "string" ? ((raw as Error & { code: string }).code as string) : undefined;
  const category = (code && SMTP_CATEGORY_BY_CODE[code]) || (typeof code === "string" && SAFE_SMTP_CODE.test(code) ? "rejected" : "protocol");
  const codePart = code && SAFE_SMTP_CODE.test(code) ? ` (${code})` : "";
  return new EmailDeliveryError(category, `SMTP delivery failed${codePart}`, raw);
}

export interface EmailTransport {
  send(params: { to: string; subject: string; html: string; text: string }): Promise<EmailSendResult>;
  testConnection?(): Promise<TransportTestResult>;
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

  async testConnection(): Promise<TransportTestResult> {
    return { ok: true, category: "console" };
  }

  resetCaptured(): void {
    this.captured = [];
    this.counter = 0;
  }

  lastEmail(): CapturedEmail | undefined {
    return this.captured[this.captured.length - 1];
  }
}

export type SmtpEmailTransportOptions = {
  host: string;
  port: number;
  secure: boolean;
  /** Skip STARTTLS entirely — for a localhost relay whose self-signed cert fails the handshake. */
  ignoreTls?: boolean;
  from: string;
  fromName?: string;
  replyTo?: string;
  user?: string;
  pass?: string;
  connectionTimeoutMs?: number;
  greetingTimeoutMs?: number;
};

type Mailer = {
  sendMail(options: Record<string, unknown>): Promise<{ messageId?: unknown }>;
  close?(): void;
  verify?(): Promise<boolean>;
};

function formatFromAddress(from: string, fromName?: string): string {
  return fromName ? `${fromName} <${from}>` : from;
}

export class SmtpEmailTransport implements EmailTransport {
  private host: string;
  private port: number;
  private secure: boolean;
  private ignoreTls: boolean;
  private user?: string;
  private pass?: string;
  private fromName?: string;
  private replyTo?: string;
  private from: string;
  private connectionTimeoutMs: number;
  private greetingTimeoutMs: number;
  private ready: Promise<void>;

  constructor(opts: SmtpEmailTransportOptions) {
    this.host = opts.host;
    this.port = opts.port;
    this.secure = opts.secure;
    this.ignoreTls = opts.ignoreTls ?? false;
    this.user = opts.user;
    this.pass = opts.pass;
    this.fromName = opts.fromName;
    this.replyTo = opts.replyTo;
    this.from = opts.from;
    this.connectionTimeoutMs = opts.connectionTimeoutMs ?? 15_000;
    this.greetingTimeoutMs = opts.greetingTimeoutMs ?? 15_000;
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const mod = await import("nodemailer");
    if (!mod || typeof mod.createTransport !== "function") {
      throw new EmailDeliveryError("config", "EMAIL_SERVICE_CONFIG_ERROR: nodemailer is installed but createTransport is unavailable");
    }
  }

  private async withTransporter<T>(fn: (transporter: Mailer) => Promise<T>): Promise<T> {
    await this.ready;
    const mod = await import("nodemailer");
    const transporter = mod.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      ignoreTLS: this.ignoreTls,
      connectionTimeout: this.connectionTimeoutMs,
      greetingTimeout: this.greetingTimeoutMs,
      socketTimeout: this.connectionTimeoutMs,
      auth: this.user && this.pass ? { user: this.user, pass: this.pass } : undefined,
    }) as unknown as Mailer;
    try {
      return await fn(transporter);
    } finally {
      transporter.close?.();
    }
  }

  async send(params: { to: string; subject: string; html: string; text: string }): Promise<EmailSendResult> {
    try {
      return await this.withTransporter(async (transporter) => {
        const info = await transporter.sendMail({
          from: formatFromAddress(this.from, this.fromName),
          replyTo: this.replyTo ?? undefined,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
        });
        const messageId = typeof info.messageId === "string" && info.messageId ? info.messageId : `smtp.${Date.now()}`;
        return { ok: true, messageId };
      });
    } catch (error) {
      throw sanitizeSmtpError(error);
    }
  }

  async testConnection(): Promise<TransportTestResult> {
    try {
      const ok = await this.withTransporter(async (transporter) => {
        if (typeof transporter.verify !== "function") return false;
        return Boolean(await transporter.verify());
      });
      return ok ? { ok: true, category: "connection" } : { ok: false, category: "connection", message: "SMTP verify returned false" };
    } catch (error) {
      const sanitized = sanitizeSmtpError(error);
      return { ok: false, category: sanitized.category, message: sanitized.message };
    }
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

export function normalizeEmailTransportChoice(value: string | undefined): "console" | "smtp" | "" {
  const choice = (value ?? "").trim().toLowerCase();
  if (choice === "console" || choice === "smtp") return choice;
  return "";
}

export function createSmtpTransportFromEnv(env: NodeJS.ProcessEnv = process.env): SmtpEmailTransport {
  const host = env.SMTP_HOST?.trim();
  if (!host) {
    throw new EmailDeliveryError("config", "SMTP_HOST is required when EMAIL_TRANSPORT=smtp or SMTP_HOST is set");
  }
  const from = env.MAIL_FROM_ADDRESS?.trim() || env.SMTP_FROM?.trim() || "no-reply@akarpromax.om";
  const fromName = env.MAIL_FROM_NAME?.trim() || env.SMTP_FROM_NAME?.trim() || "AkarProMax";
  return new SmtpEmailTransport({
    host,
    port: Number(env.SMTP_PORT ?? 587),
    secure: String(env.SMTP_SECURE ?? "false").toLowerCase() === "true",
    ignoreTls: String(env.SMTP_IGNORE_TLS ?? "false").toLowerCase() === "true",
    from,
    fromName,
    replyTo: env.MAIL_REPLY_TO?.trim() || undefined,
    user: env.SMTP_USER?.trim() || undefined,
    pass: env.SMTP_PASS?.trim() || undefined,
  });
}

function resolveTransport(): EmailTransport {
  if (injectedTransport) return injectedTransport;
  const choice = normalizeEmailTransportChoice(process.env.EMAIL_TRANSPORT);
  if (choice === "smtp") return createSmtpTransportFromEnv();
  if (choice === "console") return getConsoleTransport();
  const smtpHost = process.env.SMTP_HOST?.trim();
  if (smtpHost) return createSmtpTransportFromEnv();
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

export function getEmailRuntimeStatus(env: NodeJS.ProcessEnv = process.env): EmailRuntimeStatus {
  const choice = normalizeEmailTransportChoice(env.EMAIL_TRANSPORT);
  const smtpHost = env.SMTP_HOST?.trim();
  const smtpUser = env.SMTP_USER?.trim();
  const smtpPass = env.SMTP_PASS?.trim();
  const sender = env.SMTP_FROM?.trim() || env.MAIL_FROM_ADDRESS?.trim() || "";
  const publicBaseUrl = env.APP_PUBLIC_URL?.trim() || env.APP_URL?.trim() || "";
  const transport: EmailRuntimeStatus["transport"] = choice === "smtp" || (choice !== "console" && Boolean(smtpHost)) ? "smtp" : "console";
  const senderConfigured = Boolean(sender);
  const configured = Boolean(transport === "smtp" && smtpHost && smtpUser && smtpPass && senderConfigured);
  return {
    transport,
    configured,
    senderConfigured,
    publicBaseUrlConfigured: Boolean(publicBaseUrl),
    productionCapable: configured && Boolean(publicBaseUrl),
  };
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

  async testConnection(): Promise<TransportTestResult> {
    if (typeof this.transport.testConnection === "function") {
      return this.transport.testConnection();
    }
    return { ok: false, category: "config", message: "transport does not support connection testing" };
  }

  getTransport(): EmailTransport {
    return this.transport;
  }
}

export const emailService = createEmailService();
