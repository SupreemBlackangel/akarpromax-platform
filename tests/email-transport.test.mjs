import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:net";

import {
  EmailDeliveryError,
  SmtpEmailTransport,
  createEmailService,
  createSmtpTransportFromEnv,
  getEmailRuntimeStatus,
  sanitizeSmtpError,
} from "../lib/email.ts";
import { renderEmail } from "../lib/email/templates.ts";
import { RuntimeEnvError, validateRuntimeEnv } from "../lib/config/runtime-env.ts";
import { buildVerificationEmailUrl, tokenExpiryMinutes } from "../lib/auth/verification.ts";

const LOCALES = ["ar", "en", "tr"];
const KINDS = ["verification", "otp", "welcome", "reset", "password_changed", "email_changed", "email_change_confirm"];

function baseVars(kind) {
  return {
    brandTitle: "AkarProMax",
    brandUrl: "https://akarpromax.om",
    recipientName: "Test User",
    ...(kind === "otp" ? { otpCode: "123456" } : {}),
  };
}

test("email: every template kind renders html + plain-text fallback for ar/en/tr", () => {
  for (const locale of LOCALES) {
    for (const kind of KINDS) {
      const urls = kind === "verification" || kind === "email_change_confirm" ? { verificationUrl: "https://akarpromax.om/verify-email?token=abc" } : kind === "reset" ? { resetUrl: "https://akarpromax.om/reset-password?token=abc" } : {};
      const { subject, html, text } = renderEmail(locale, kind, baseVars(kind), urls);
      assert.ok(subject.length > 0, `${kind}/${locale} subject`);
      assert.ok(html.length > 0, `${kind}/${locale} html`);
      assert.ok(text.length > 0, `${kind}/${locale} plain-text fallback`);
    }
  }
});

test("email: arabic html is RTL, english/turkish are LTR, CTA present", () => {
  const ar = renderEmail("ar", "verification", baseVars("verification"), { verificationUrl: "https://akarpromax.om/verify-email?token=abc" });
  const en = renderEmail("en", "verification", baseVars("verification"), { verificationUrl: "https://akarpromax.om/verify-email?token=abc" });
  const tr = renderEmail("tr", "verification", baseVars("verification"), { verificationUrl: "https://akarpromax.om/verify-email?token=abc" });
  assert.ok(ar.html.includes('dir="rtl"'));
  assert.ok(en.html.includes('dir="ltr"'));
  assert.ok(tr.html.includes('dir="ltr"'));
  assert.ok(ar.html.includes("تفعيل البريد الإلكتروني"));
  assert.ok(tr.html.includes("E-postayı doğrula"));
  for (const html of [ar.html, en.html, tr.html]) {
    assert.ok(html.includes("akarpromax.om/verify-email?token=abc"));
  }
});

test("email: verification link builder uses the configured public origin and encodes the token", () => {
  const url = buildVerificationEmailUrl("https://staging.akarpromax.om/", "tok+en/1");
  assert.ok(url.startsWith("https://staging.akarpromax.om/verify-email?token="));
  assert.ok(url.includes("tok%2Ben%2F1"));
  assert.equal(tokenExpiryMinutes(), 1440);
});

test("runtime env: APP_PUBLIC_URL takes precedence over APP_URL for appOrigin", () => {
  const dev = validateRuntimeEnv({ NODE_ENV: "development", APP_PUBLIC_URL: "https://public.akarpromax.om", APP_URL: "http://localhost:3010" });
  assert.equal(dev.appOrigin, "https://public.akarpromax.om");

  const prod = validateRuntimeEnv({
    NODE_ENV: "production",
    SESSION_SECRET: "a-strong-32-plus-character-session-secret-0000",
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    APP_PUBLIC_URL: "https://prod.akarpromax.om",
    APP_URL: "http://localhost:3000",
    TRUSTED_ORIGINS: "https://prod.akarpromax.om",
    DB_PROVIDER: "mysql",
  });
  assert.equal(prod.appOrigin, "https://prod.akarpromax.om");
});

test("runtime env: invalid EMAIL_TRANSPORT is rejected in production", () => {
  const base = {
    NODE_ENV: "production",
    SESSION_SECRET: "a-strong-32-plus-character-session-secret-0000",
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    APP_PUBLIC_URL: "https://prod.akarpromax.om",
    TRUSTED_ORIGINS: "https://prod.akarpromax.om",
    DB_PROVIDER: "mysql",
    EMAIL_TRANSPORT: "carrier-pigeon",
  };
  assert.throws(() => validateRuntimeEnv(base), (error) => error instanceof RuntimeEnvError && error.variable === "EMAIL_TRANSPORT");
});

test("email readiness: console is never production-capable; smtp + sender + public url is", () => {
  assert.deepEqual(getEmailRuntimeStatus({ APP_URL: "http://localhost:3010", EMAIL_TRANSPORT: "console" }), {
    transport: "console",
    configured: false,
    senderConfigured: false,
    publicBaseUrlConfigured: true,
    productionCapable: false,
  });

  assert.deepEqual(
    getEmailRuntimeStatus({
      EMAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "mailer",
      SMTP_PASS: "secret",
      SMTP_FROM: "no-reply@example.com",
      APP_PUBLIC_URL: "https://staging.akarpromax.om",
    }),
    {
      transport: "smtp",
      configured: true,
      senderConfigured: true,
      publicBaseUrlConfigured: true,
      productionCapable: true,
    },
  );
});

test("email readiness: forced console transport stays console even when SMTP_HOST is present", () => {
  const status = getEmailRuntimeStatus({
    EMAIL_TRANSPORT: "console",
    SMTP_HOST: "smtp.example.com",
    SMTP_USER: "u",
    SMTP_PASS: "p",
    SMTP_FROM: "x@example.com",
    APP_PUBLIC_URL: "https://example.com",
  });
  assert.equal(status.transport, "console");
  assert.equal(status.productionCapable, false);
});

test("email readiness: EMAIL_TRANSPORT=smtp without SMTP_HOST is not configured", () => {
  const status = getEmailRuntimeStatus({ EMAIL_TRANSPORT: "smtp", APP_PUBLIC_URL: "https://example.com" });
  assert.equal(status.transport, "smtp");
  assert.equal(status.configured, false);
  assert.equal(status.productionCapable, false);
});

test("smtp transport: createSmtpTransportFromEnv requires SMTP_HOST", () => {
  assert.throws(() => createSmtpTransportFromEnv({ EMAIL_TRANSPORT: "smtp" }), (error) => error instanceof EmailDeliveryError && error.category === "config");
});

test("email service: invalid recipient returns ok=false without calling the transport", async () => {
  let called = false;
  const stub = {
    async send() {
      called = true;
      throw new Error("must not be called");
    },
  };
  const service = createEmailService({ transport: stub  });
  const result = await service.send("welcome", { to: "not-an-email" });
  assert.equal(result.ok, false);
  assert.equal(called, false);
});

test("smtp error sanitization: auth/timeout/refused/protocol map to safe categories and never leak secrets", () => {
  const leaked = sanitizeSmtpError(Object.assign(new Error("535 Authentication failed password=super-secret-value"), { code: "EAUTH" }));
  assert.equal(leaked.category, "auth");
  assert.ok(!leaked.message.includes("super-secret-value"));
  assert.ok(!leaked.stack?.includes("super-secret-value"));

  assert.equal(sanitizeSmtpError(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })).category, "timeout");
  assert.equal(sanitizeSmtpError(Object.assign(new Error("refused"), { code: "ECONNREFUSED" })).category, "refused");
  assert.equal(sanitizeSmtpError(Object.assign(new Error("connect"), { code: "ECONNECTION" })).category, "connection");
  assert.equal(sanitizeSmtpError(Object.assign(new Error("proto"), { code: "EPROTOCOL" })).category, "protocol");
  assert.equal(sanitizeSmtpError(new Error("unmapped")).category, "protocol");
});

function createMockSmtp(opts = {}) {
  return new Promise((resolve, reject) => {
    const messages = [];
    const server = createServer((socket) => {
      let buffer = "";
      let inData = false;
      let dataBuffer = "";
      let authPhase = 0;
      socket.setNoDelay(true);
      socket.write("220 mock.local ESMTP AkarProMax\r\n");
      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        if (opts.silent) return;
        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).replace(/\r$/, "");
          buffer = buffer.slice(idx + 1);
          if (inData) {
            if (line === ".") {
              inData = false;
              messages.push(dataBuffer);
              dataBuffer = "";
              socket.write("250 2.0.0 Ok: queued as MOCK12345\r\n");
            } else {
              dataBuffer += `${line}\n`;
            }
            continue;
          }
          const upper = line.toUpperCase();
          if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
            socket.write("250-mock.local\r\n250-AUTH LOGIN PLAIN\r\n250 OK\r\n");
          } else if (upper.startsWith("AUTH PLAIN")) {
            authPhase = 0;
            if (opts.authFail) socket.write("535 5.7.8 Authentication credentials invalid\r\n");
            else socket.write("235 2.7.0 Authentication successful\r\n");
          } else if (upper.startsWith("AUTH LOGIN")) {
            authPhase = 1;
            socket.write("334 VXNlcm5hbWU6\r\n");
          } else if (authPhase === 1) {
            authPhase = 2;
            socket.write("334 UGFzc3dvcmQ6\r\n");
          } else if (authPhase === 2) {
            authPhase = 0;
            if (opts.authFail) socket.write("535 5.7.8 Authentication credentials invalid\r\n");
            else socket.write("235 2.7.0 Authentication successful\r\n");
          } else if (upper.startsWith("MAIL FROM")) {
            socket.write("250 2.1.0 Ok\r\n");
          } else if (upper.startsWith("RCPT TO")) {
            socket.write("250 2.1.5 Ok\r\n");
          } else if (upper.startsWith("DATA")) {
            inData = true;
            socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
          } else if (upper.startsWith("QUIT")) {
            socket.write("221 2.0.0 Bye\r\n");
            socket.end();
          } else if (!opts.silent) {
            socket.write("250 OK\r\n");
          }
        }
      });
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() ;
      resolve({
        server,
        port: address.port,
        messages,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

test("smtp transport: sends a real message through a local SMTP sink with auth and a From name", async () => {
  const mock = await createMockSmtp();
  try {
    const transport = new SmtpEmailTransport({
      host: "127.0.0.1",
      port: mock.port,
      secure: false,
      from: "no-reply@akarpromax.om",
      fromName: "AkarProMax",
      user: "mailer",
      pass: "smtp-password-value",
      connectionTimeoutMs: 5000,
      greetingTimeoutMs: 5000,
    });
    const result = await transport.send({ to: "tester@example.com", subject: "Verify your email on AkarProMax", html: "<h1>Hi</h1>", text: "Hi" });
    assert.equal(result.ok, true);
    assert.ok(result.messageId.length > 0);
    const data = mock.messages[0] ?? "";
    assert.ok(data.includes("From: AkarProMax <no-reply@akarpromax.om>"), data);
    assert.ok(data.includes("To: tester@example.com"));
    assert.ok(data.includes("Subject: Verify your email on AkarProMax"));
    assert.ok(data.includes("<h1>Hi</h1>"));
  } finally {
    await mock.close();
  }
});

test("smtp transport: rejected AUTH surfaces as category=auth EmailDeliveryError (no secrets)", async () => {
  const mock = await createMockSmtp({ authFail: true });
  try {
    const transport = new SmtpEmailTransport({
      host: "127.0.0.1",
      port: mock.port,
      secure: false,
      from: "no-reply@akarpromax.om",
      user: "mailer",
      pass: "smtp-password-value",
      connectionTimeoutMs: 5000,
      greetingTimeoutMs: 5000,
    });
    await assert.rejects(
      transport.send({ to: "tester@example.com", subject: "s", html: "h", text: "t" }),
      (error) => {
        assert.ok(error instanceof EmailDeliveryError);
        assert.equal(error.category, "auth");
        assert.ok(!error.message.includes("smtp-password-value"));
        assert.ok(!error.stack?.includes("smtp-password-value"));
        return true;
      },
    );
  } finally {
    await mock.close();
  }
});

test("smtp transport: connection refused surfaces as category=refused EmailDeliveryError", async () => {
  const probe = await createMockSmtp();
  const port = probe.port;
  await probe.close();
  const transport = new SmtpEmailTransport({
    host: "127.0.0.1",
    port,
    secure: false,
    from: "no-reply@akarpromax.om",
    connectionTimeoutMs: 3000,
    greetingTimeoutMs: 3000,
  });
  await assert.rejects(
    transport.send({ to: "tester@example.com", subject: "s", html: "h", text: "t" }),
    (error) => {
      assert.ok(error instanceof EmailDeliveryError);
      assert.ok(["refused", "connection"].includes(error.category), `category=${error.category}`);
      return true;
    },
  );
});

test("smtp transport: silent server (timeout) surfaces as category=timeout EmailDeliveryError", { timeout: 20_000 }, async () => {
  const mock = await createMockSmtp({ silent: true });
  try {
    const transport = new SmtpEmailTransport({
      host: "127.0.0.1",
      port: mock.port,
      secure: false,
      from: "no-reply@akarpromax.om",
      connectionTimeoutMs: 1500,
      greetingTimeoutMs: 1500,
    });
    await assert.rejects(
      transport.send({ to: "tester@example.com", subject: "s", html: "h", text: "t" }),
      (error) => {
        assert.ok(error instanceof EmailDeliveryError);
        assert.equal(error.category, "timeout");
        return true;
      },
    );
  } finally {
    await mock.close();
  }
});

test("smtp transport: testConnection succeeds against a healthy sink and fails cleanly on refusal", async () => {
  const mock = await createMockSmtp();
  try {
    const transport = new SmtpEmailTransport({
      host: "127.0.0.1",
      port: mock.port,
      secure: false,
      from: "no-reply@akarpromax.om",
      user: "mailer",
      pass: "p",
      connectionTimeoutMs: 5000,
      greetingTimeoutMs: 5000,
    });
    const result = await transport.testConnection();
    assert.equal(result.ok, true);
  } finally {
    await mock.close();
  }

  const probe = await createMockSmtp();
  const closedPort = probe.port;
  await probe.close();
  const refused = await new SmtpEmailTransport({
    host: "127.0.0.1",
    port: closedPort,
    secure: false,
    from: "no-reply@akarpromax.om",
    connectionTimeoutMs: 3000,
    greetingTimeoutMs: 3000,
  }).testConnection();
  assert.equal(refused.ok, false);
  assert.ok(["refused", "connection"].includes(refused.category ?? ""), `category=${refused.category}`);
});
