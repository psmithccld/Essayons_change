// Email service implementation using SendGrid - integration from blueprint:javascript_sendgrid
import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set - email notifications disabled");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Email not sent - SENDGRID_API_KEY not configured');
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Generate secure random token for email verification
export function generateSecureToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

// Email templates
export function createVerificationEmailHtml(verificationLink: string, name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Project Management System</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0;">Secure Change Management & Collaboration</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <h2 style="color: #333; margin-top: 0;">Welcome, ${name}!</h2>
        
        <p style="font-size: 16px; margin-bottom: 25px;">
          Thank you for joining our comprehensive project management and change management platform. 
          To complete your registration and set up your password, please verify your email address.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    text-decoration: none; 
                    padding: 15px 30px; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    font-size: 16px; 
                    display: inline-block;">
            Verify Email & Set Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 25px;">
          <strong>Security Notice:</strong> This verification link will expire in 24 hours for your security. 
          If you didn't request this account, please ignore this email.
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 15px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <span style="word-break: break-all; color: #4a5568;">${verificationLink}</span>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Project Management System. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

export function createVerificationEmailText(verificationLink: string, name: string): string {
  return `
Welcome to Project Management System, ${name}!

Thank you for joining our comprehensive project management and change management platform.

To complete your registration and set up your password, please verify your email address by clicking the link below:

${verificationLink}

This verification link will expire in 24 hours for your security.

If you didn't request this account, please ignore this email.

If the link doesn't work, copy and paste it into your browser.

© ${new Date().getFullYear()} Project Management System. All rights reserved.
  `.trim();
}