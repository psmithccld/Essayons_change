// Using SendGrid integration blueprint
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
    console.log('Email notification skipped - SendGrid not configured');
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
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendTaskAssignmentNotification(
  assigneeEmail: string, 
  taskName: string, 
  projectName: string, 
  dueDate?: string | null
): Promise<boolean> {
  const subject = `New Task Assigned: ${taskName}`;
  const text = `You have been assigned a new task "${taskName}" in project "${projectName}".${dueDate ? ` Due date: ${dueDate}` : ''}`;
  const html = `
    <h2>New Task Assignment</h2>
    <p>You have been assigned a new task:</p>
    <ul>
      <li><strong>Task:</strong> ${taskName}</li>
      <li><strong>Project:</strong> ${projectName}</li>
      ${dueDate ? `<li><strong>Due Date:</strong> ${dueDate}</li>` : ''}
    </ul>
    <p>Please check your project management dashboard for more details.</p>
  `;

  return sendEmail({
    to: assigneeEmail,
    from: 'noreply@changemanagement.com', // Should be configured in environment
    subject,
    text,
    html
  });
}