import { EmailDeliveryError, createSmtpTransportFromEnv, getEmailRuntimeStatus } from "@/lib/email";

/**
 * Release support tool: reports email runtime status and, when an SMTP provider
 * is configured, verifies the connection WITHOUT sending mail and WITHOUT ever
 * printing SMTP_PASS, tokens, or raw SMTP error internals.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/email-provider-check.ts
 */

async function main(): Promise<void> {
  const status = getEmailRuntimeStatus();

  console.log("AKARPROMAX EMAIL PROVIDER CHECK");
  console.log("--------------------------------");
  console.log(`transport            : ${status.transport}`);
  console.log(`configured           : ${status.configured ? "true" : "false"}`);
  console.log(`senderConfigured     : ${status.senderConfigured ? "true" : "false"}`);
  console.log(`publicBaseUrlConfigured: ${status.publicBaseUrlConfigured ? "true" : "false"}`);
  console.log(`productionCapable    : ${status.productionCapable ? "true" : "false"}`);

  if (status.transport === "smtp" && status.configured) {
    try {
      const transport = createSmtpTransportFromEnv();
      const result = await transport.testConnection();
      if (result.ok) {
        console.log(`connection           : PASS (host verified)`);
      } else {
        console.log(`connection           : FAIL (category=${result.category})`);
        console.log(`                       ${result.message ?? "no detail"}`);
        process.exitCode = 1;
      }
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        console.log(`connection           : FAIL (category=${error.category})`);
      } else {
        console.log(`connection           : FAIL (unexpected error type)`);
      }
      process.exitCode = 1;
    }
  } else if (status.transport === "smtp") {
    console.log(`connection           : NOT CONFIGURED (missing SMTP_HOST/SMTP_USER/SMTP_PASS/from)`);
    process.exitCode = 1;
  } else {
    console.log(`connection           : NOT CONFIGURED (console transport is not a real provider)`);
    process.exitCode = 1;
  }

  if (!status.productionCapable) {
    console.log("--------------------------------");
    console.log("EMAIL READY FOR STAGING = NO — blocked only by real provider configuration.");
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
