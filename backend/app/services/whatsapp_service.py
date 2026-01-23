"""
WhatsApp service for sending automated messages via Twilio
"""

import logging
from datetime import datetime
from typing import Optional

from twilio.rest import Client

from ..config import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Service for sending WhatsApp messages via Twilio"""

    def __init__(self):
        """Initialize Twilio client"""
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.whatsapp_number = (
            settings.TWILIO_WHATSAPP_NUMBER or "whatsapp:+14155238886"
        )

        if not self.account_sid or not self.auth_token:
            logger.warning(
                "Twilio credentials not configured. WhatsApp messages will not be sent."
            )
            self.client = None
        else:
            self.client = Client(self.account_sid, self.auth_token)
            logger.info("WhatsApp service initialized successfully")

    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number for WhatsApp
        Accepts: +27123456789, 0123456789, 27123456789
        Returns: whatsapp:+27123456789
        """
        # Remove all spaces and special characters except +
        phone = (
            phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        )

        # Handle local format (starts with 0)
        if phone.startswith("0"):
            phone = "+27" + phone[1:]
        # Handle international without +
        elif phone.startswith("27"):
            phone = "+" + phone
        # Handle already formatted
        elif not phone.startswith("+"):
            phone = "+" + phone

        return f"whatsapp:{phone}"

    def send_booking_confirmation(
        self,
        student_name: str,
        student_phone: str,
        instructor_name: str,
        lesson_date: datetime,
        pickup_address: str,
        amount: float,
        booking_reference: str,
        student_notes: str = None,
    ) -> bool:
        """
        Send booking confirmation message to student
        """
        if not self.client:
            logger.warning(
                "Twilio client not initialized. Skipping confirmation message."
            )
            return False

        try:
            notes_section = (
                f"\n\n📝 *Your Notes:*\n{student_notes}" if student_notes else ""
            )

            message_body = f"""✅ *Booking Confirmed!*

Hello {student_name},

Your driving lesson has been booked successfully.

📋 *Booking Details:*
• Reference: {booking_reference}
• Instructor: {instructor_name}
• Date: {lesson_date.strftime('%A, %d %B %Y')}
• Time: {lesson_date.strftime('%I:%M %p')}
• Pickup: {pickup_address}
• Amount: R{amount:.2f}{notes_section}

Drive Safe! 🚗
- Drive Alive Team"""

            to_number = self._format_phone_number(student_phone)

            message = self.client.messages.create(
                body=message_body, from_=self.whatsapp_number, to=to_number
            )

            logger.info(f"Booking confirmation sent to {student_name}: {message.sid}")
            return True

        except Exception as e:
            logger.error(f"Failed to send booking confirmation: {str(e)}")
            return False

    def send_student_reminder(
        self,
        student_name: str,
        student_phone: str,
        instructor_name: str,
        instructor_phone: str,
        lesson_date: datetime,
        pickup_address: str,
        booking_reference: str,
        student_notes: str = None,
    ) -> bool:
        """
        Send 1-hour reminder to student before lesson
        """
        if not self.client:
            logger.warning("Twilio client not initialized. Skipping student reminder.")
            return False

        try:
            notes_section = (
                f"\n\n📝 *Your Notes:*\n{student_notes}" if student_notes else ""
            )

            message_body = f"""⏰ *Lesson Reminder*

Hello {student_name},

Your driving lesson is coming up.

📋 *Lesson Details:*
• Reference: {booking_reference}
• Instructor: {instructor_name}
• Date: {lesson_date.strftime('%A, %d %B %Y')}
• Time: {lesson_date.strftime('%I:%M %p')}
• Pickup: {pickup_address}{notes_section}

📞 Instructor Contact: {instructor_phone}

Please be ready for your lesson.

Drive Safe! 🚗
- Drive Alive Team"""

            to_number = self._format_phone_number(student_phone)

            message = self.client.messages.create(
                body=message_body, from_=self.whatsapp_number, to=to_number
            )

            logger.info(f"Student 1hr reminder sent to {student_name}: {message.sid}")
            return True

        except Exception as e:
            logger.error(f"Failed to send student reminder: {str(e)}")
            return False

    def send_instructor_reminder(
        self,
        instructor_name: str,
        instructor_phone: str,
        student_name: str,
        student_phone: str,
        lesson_date: datetime,
        pickup_address: str,
        booking_reference: str,
        student_notes: str = None,
    ) -> bool:
        """
        Send 15-minute reminder to instructor before lesson
        """
        if not self.client:
            logger.warning(
                "Twilio client not initialized. Skipping instructor reminder."
            )
            return False

        try:
            notes_section = (
                f"\n\n📝 *Student Notes:*\n{student_notes}" if student_notes else ""
            )

            message_body = f"""⏰ *Lesson Reminder*

Hello {instructor_name},

Your next lesson is coming up.

📋 *Lesson Details:*
• Reference: {booking_reference}
• Student: {student_name}
• Date: {lesson_date.strftime('%A, %d %B %Y')}
• Time: {lesson_date.strftime('%I:%M %p')}
• Pickup: {pickup_address}{notes_section}

📞 Student Contact: {student_phone}

Drive Safe! 🚗
- Drive Alive Team"""

            to_number = self._format_phone_number(instructor_phone)

            message = self.client.messages.create(
                body=message_body, from_=self.whatsapp_number, to=to_number
            )

            logger.info(f"Instructor reminder sent to {instructor_name}: {message.sid}")
            return True

        except Exception as e:
            logger.error(f"Failed to send instructor reminder: {str(e)}")
            return False

    def send_same_day_booking_notification(
        self,
        instructor_name: str,
        instructor_phone: str,
        student_name: str,
        student_phone: str,
        lesson_date: datetime,
        pickup_address: str,
        booking_reference: str,
        amount: float,
        student_notes: str = None,
    ) -> bool:
        """
        Send immediate notification to instructor for same-day bookings that are paid/confirmed
        """
        if not self.client:
            logger.warning(
                "Twilio client not initialized. Skipping same-day notification."
            )
            return False

        try:
            notes_section = (
                f"\n\n📝 *Student Notes:*\n{student_notes}" if student_notes else ""
            )

            message_body = f"""🔔 *New Lesson Booked!*

Hello {instructor_name},

You have a new confirmed booking.

📋 *Lesson Details:*
• Reference: {booking_reference}
• Student: {student_name}
• Date: {lesson_date.strftime('%A, %d %B %Y')}
• Time: {lesson_date.strftime('%I:%M %p')}
• Pickup: {pickup_address}
• Amount: R{amount:.2f}{notes_section}

📞 Student Contact: {student_phone}

Drive Safe! 🚗
- Drive Alive Team"""

            to_number = self._format_phone_number(instructor_phone)

            message = self.client.messages.create(
                body=message_body, from_=self.whatsapp_number, to=to_number
            )

            logger.info(
                f"Same-day booking notification sent to {instructor_name}: {message.sid}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to send same-day booking notification: {str(e)}")
            return False

    def send_daily_summary(
        self, instructor_name: str, instructor_phone: str, bookings_summary: str
    ) -> bool:
        """
        Send daily summary of all bookings to instructor
        """
        if not self.client:
            logger.warning("Twilio client not initialized. Skipping daily summary.")
            return False

        try:
            message_body = f"""📅 *Daily Schedule*

Hello {instructor_name},

Here are your upcoming lessons:

{bookings_summary}

Drive Safe! 🚗
- Drive Alive Team"""

            to_number = self._format_phone_number(instructor_phone)

            message = self.client.messages.create(
                body=message_body, from_=self.whatsapp_number, to=to_number
            )

            logger.info(f"Daily summary sent to {instructor_name}: {message.sid}")
            return True

        except Exception as e:
            logger.error(f"Failed to send daily summary: {str(e)}")
            return False


# Global service instance
whatsapp_service = WhatsAppService()
