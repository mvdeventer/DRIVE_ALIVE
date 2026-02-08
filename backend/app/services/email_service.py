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

    def __init__(self, smtp_email: str = None, smtp_password: str = None):
        """
        Initialize email service
        
        Args:
            smtp_email: Gmail address (for verification emails). If None, uses settings.
            smtp_password: Gmail app password. If None, uses settings.
        """
        if smtp_email and smtp_password:
            # Dynamic credentials (for verification emails from admin's Gmail)
            self.smtp_server = "smtp.gmail.com"
            self.smtp_port = 587
            self.smtp_username = smtp_email
            self.smtp_password = smtp_password
            self.from_email = smtp_email
        else:
            # Static credentials from settings (for password resets)
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

    def send_verification_email(
        self, to_email: str, first_name: str, verification_link: str, validity_minutes: int
    ) -> bool:
        """
        Send account verification email

        Args:
            to_email: Recipient email address
            first_name: User's first name
            verification_link: Full verification URL
            validity_minutes: Link validity in minutes

        Returns:
            bool: True if sent successfully
        """
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP not configured. Verification email not sent to %s", to_email)
            logger.info("Verification link for %s: %s", to_email, verification_link)
            return False

        subject = "Verify Your Driving School Account"

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #007AFF; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }}
        .button {{ display: inline-block; padding: 15px 30px; background-color: #007AFF; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
        .warning {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚗 Driving School Account Verification</h1>
        </div>
        <div class="content">
            <h2>Hi {first_name}!</h2>
            <p>Thank you for registering with our Driving School. To complete your registration, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="{verification_link}" class="button">✓ Verify My Account</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #fff; padding: 10px; border: 1px solid #ddd;">{verification_link}</p>
            
            <div class="warning">
                <strong>⏰ Important:</strong> This verification link will expire in <strong>{validity_minutes} minutes</strong>. 
                If you don't verify within this time, your account will be automatically deleted and you'll need to register again.
            </div>
            
            <p>If you didn't create an account with us, please ignore this email. The account will be automatically removed after {validity_minutes} minutes.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 Drive Alive - Your Trusted Driving School Platform</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
"""

        plain_body = f"""
Hi {first_name}!

Thank you for registering with our Driving School. To complete your registration, please verify your email address.

Verification link: {verification_link}

IMPORTANT: This link will expire in {validity_minutes} minutes. If you don't verify within this time, your account will be automatically deleted.

If you didn't create an account with us, please ignore this email.

© 2026 Drive Alive
"""

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email

            part1 = MIMEText(plain_body, "plain")
            part2 = MIMEText(html_body, "html")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            logger.info("Verification email sent to %s", to_email)
            return True

        except Exception as e:
            logger.error("Failed to send verification email to %s: %s", to_email, e)
            return False

    def send_test_email(self, to_email: str) -> bool:
        """
        Send a test email to verify SMTP configuration

        Args:
            to_email: Recipient email address

        Returns:
            bool: True if sent successfully
        """
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP not configured. Cannot send test email.")
            return False

        subject = "Test Email - Driving School SMTP Configuration"

        html_body = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .success { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h2>✅ SMTP Configuration Test</h2>
        <div class="success">
            <strong>Success!</strong> Your email configuration is working correctly.
        </div>
        <p>This is a test email to confirm that your Gmail SMTP settings are configured properly.</p>
        <p>You can now send verification emails to users who register on your platform.</p>
    </div>
</body>
</html>
"""

        plain_body = "SMTP Configuration Test: If you received this email, your Gmail SMTP settings are working correctly!"

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email

            part1 = MIMEText(plain_body, "plain")
            part2 = MIMEText(html_body, "html")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            logger.info("Test email sent to %s", to_email)
            return True

        except Exception as e:
            logger.error("Failed to send test email to %s: %s", to_email, e)
            return False

    def send_admin_student_registration_notification(
        self,
        admin_email: str,
        admin_name: str,
        student_name: str,
        student_email: str,
        student_phone: str,
        verification_link: str
    ) -> bool:
        """
        Send notification to admin about new student registration
        
        Args:
            admin_email: Admin's email address
            admin_name: Admin's first name
            student_name: Student's full name
            student_email: Student's email
            student_phone: Student's phone
            verification_link: Link for student verification
            
        Returns:
            bool: True if sent successfully
        """
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP not configured. Cannot send admin notification.")
            return False

        subject = f"New Student Registration - {student_name}"

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
        .content {{ background-color: #f9f9f9; padding: 20px; }}
        .info-box {{ background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 15px 0; }}
        .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }}
        .info-label {{ font-weight: bold; color: #555; }}
        .info-value {{ color: #333; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 New Student Registration</h1>
        </div>
        <div class="content">
            <p>Hello {admin_name},</p>
            <p>A new student has registered on the Drive Alive platform:</p>
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Student Name:</span>
                    <span class="info-value">{student_name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">{student_email}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">{student_phone}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">Awaiting Verification</span>
                </div>
            </div>
            
            <p><strong>Note:</strong> The student has been sent a verification link. Once verified, they will be able to access the platform and book lessons.</p>
            
            <p style="font-size: 12px; color: #666;">This is an automated notification. You do not need to take any action unless the student contacts you directly.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 Drive Alive. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

        plain_body = f"""
New Student Registration

Hello {admin_name},

A new student has registered:
- Name: {student_name}
- Email: {student_email}
- Phone: {student_phone}
- Status: Awaiting Verification

The student has been sent a verification link. Once verified, they will be able to book lessons.
"""

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = admin_email

            part1 = MIMEText(plain_body, "plain")
            part2 = MIMEText(html_body, "html")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            logger.info("Admin notification email sent to %s", admin_email)
            return True

        except Exception as e:
            logger.error("Failed to send admin notification to %s: %s", admin_email, e)
            return False


# Global email service instance
email_service = EmailService()

