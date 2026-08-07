declare module "nodemailer" {
  export interface SentMessageInfo {
    messageId?: string | undefined;
    accepted: string[];
    rejected: string[];
  }
  export interface Transporter {
    sendMail(options: {
      from?: string;
      to: string;
      subject: string;
      html: string;
      text: string;
    }): Promise<SentMessageInfo>;
  }
  export function createTransport(options: Record<string, unknown>): Transporter;
}
