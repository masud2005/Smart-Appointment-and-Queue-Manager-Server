/* eslint-disable prettier/prettier */
export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  requireTLS?: boolean;
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
  tls?: {
    rejectUnauthorized: boolean;
  };
}

export const getMailConfig = (): MailConfig => {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER as string,
      pass: process.env.SMTP_PASS as string,
    },
    from: process.env.SMTP_FROM as string,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false,
    },
  };
};