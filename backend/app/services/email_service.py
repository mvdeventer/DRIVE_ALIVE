"""
Email Service for sending password reset emails
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP"""

    def __init__(self):
        """Initialize email service"""
        self.smtp_server = getattr(settings, "SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = getattr(settings, "SMTP_PORT", 587)
        self.smtp_username = getattr(settings, "SMTP_USERNAME", None)
        self.smtp_password = getattr(settings, "SMTP_PASSWORD", None)
        self.from_email = getattr(settings, "FROM_EMAIL", "noreply@drivealive.com")

        if not self.smtp_username or not self.smtp_password:
            logger.warning(
                "SMTP credentials not configured. Email sending will be disabled."
            )

    def send_password_reset_email(
        self, to_email: str, reset_token: str, user_name: str
    ) -> bool:
        """
        Send password reset email with reset link
        """
        if not self.smtp_username or not self.smtp_password:
            logger.warning(
                "SMTP not configured. Password reset email not sent to %s", to_email
            )
            logger.info("Reset token for %s: %s", to_email, reset_token)
            return False

        try:
            # Create reset link (adjust URL based on your deployment)
            reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

            # Create email content
            subject = "Drive Alive - Password Reset Request"
            html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
        .content {{ background-color: #f9f9f9; padding: 20px; }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
        .warning {{ color: #dc3545; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚗 Drive Alive</h1>
        </div>
        <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello {user_name},</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <p style="text-align: center;">
                <a href="{reset_link}" class="button">Reset Password</a>
            </p>
            <p><strong>Or copy this link:</strong><br>
            <code>{reset_link}</code></p>
            <p class="warning">⚠️ This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>For security reasons, never share this link with anyone.</p>
        </div>
        <div class="footer">
            <p>Drive Alive - Your Trusted Driving School Platform</p>
            <p>This is an automated email. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
            """

            plain_body = f"""
Drive Alive - Password Reset Request

Hello {user_name},

We received a request to reset your password. Click the link below to set a new password:

{reset_link}

⚠️ This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

For security reasons, never share this link with anyone.

---
Drive Alive - Your Trusted Driving School Platform
This is an automated email. Please do not reply.
            """

            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email

            # Attach both plain and HTML versions
            part1 = MIMEText(plain_body, "plain")
            part2 = MIMEText(html_body, "html")
            msg.attach(part1)
            msg.attach(part2)

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            logger.info("Password reset email sent to %s", to_email)
            return True

        except Exception as e:
            logger.error("Failed to send password reset email to %s: %s", to_email, e)
            return False


# Global email service instance
email_service = EmailService()
