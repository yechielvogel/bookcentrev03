import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = 'noreply@bookcenter.app';
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  if (!resend) {
    console.log(`[DEV] Password reset link: ${APP_URL}/reset-password?token=${token}`);
    return;
  }

  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your password — Book Centre',
    html: `
      <h2>Reset your password</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
      <p style="margin-top:16px;color:#666;font-size:14px;">If you did not request this, you can safely ignore this email.</p>
    `,
  });
}

export async function sendInviteEmail(
  email: string,
  name: string,
  tempPassword: string,
): Promise<void> {
  if (!resend) {
    console.log(`[DEV] Invite email for ${name} <${email}> — temp password: ${tempPassword}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'You have been invited to Book Centre',
    html: `
      <h2>Welcome to Book Centre, ${name}</h2>
      <p>Your account has been created. Use the details below to log in:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary password:</strong> ${tempPassword}</p>
      <p>Please change your password after logging in.</p>
      <a href="${APP_URL}/login" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Log In</a>
    `,
  });
}
