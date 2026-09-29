import nodemailer, { Transporter } from "nodemailer";
import { EmailNotification } from "./notification.entity";
import { EmailProvider } from "./email.provider";

export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly user: string,
    private readonly password: string,
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass: password } : undefined,
    });
  }

  async send(email: EmailNotification): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
  }
}
