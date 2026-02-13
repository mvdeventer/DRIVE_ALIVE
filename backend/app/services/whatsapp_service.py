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

        if not self.account_sid or not self.auth_token:
            logger.warning(
                "Twilio credentials not configured. WhatsApp messages will not be sent."
            )
            self.client = None
        else:
            self.client = Client(self.account_sid, self.auth_token)
            logger.info("WhatsApp service initialized successfully")

    @staticmethod
    def get_admin_twilio_sender_phone(db=None) -> str:
        """
        Get the admin's configured Twilio sender phone number from database
        
        Args:
            db: Database session (will be obtained from DI if not provided)
            
        Returns:
            str: Admin's Twilio sender phone number in WhatsApp format (whatsapp:+...)
                 Returns default sandbox number if not configured
        """
        try:
            if db is None:
                from ..database import SessionLocal
                db = SessionLocal()
                should_close = True
            else:
                should_close = False
            
            from ..models.user import User, UserRole
            admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
            
            if should_close:
                db.close()
            
            # Get sender number from database, fallback to sandbox
            sender_number = admin.twilio_sender_phone_number if admin and admin.twilio_sender_phone_number else "+14155238886"
            
            # Format for WhatsApp
            return f"whatsapp:{sender_number}"
            
        except Exception as e:
            logger.warning(f"Failed to get admin Twilio sender phone: {str(e)}")
            return "whatsapp:+14155238886"  # Default sandbox number
    
    @staticmethod
    def get_admin_twilio_phone(db=None) -> Optional[str]:
        """
        Get the admin's personal phone number for receiving test messages
        
        Args:
            db: Database session (will be obtained from DI if not provided)
            
        Returns:
            str: Admin's personal phone number or None if not configured
        """
        try:
            if db is None:
                from ..database import SessionLocal
                db = SessionLocal()
                should_close = True
            else:
                should_close = False
            
            from ..models.user import User, UserRole
            admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
            
            if should_close:
                db.close()
            
            return admin.twilio_phone_number if admin else None
        except Exception as e:
            logger.warning(f"Failed to get admin Twilio phone: {str(e)}")
            return None

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

    def send_message(self, phone: str, message: str) -> bool:
        """
        Send a generic WhatsApp message
        
        Args:
            phone: Phone number in any format
            message: Message body text
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.client:
            logger.warning("Twilio client not initialized. Skipping WhatsApp message.")
            return False

        try:
            # Get sender number from database
            from_number = self.get_admin_twilio_sender_phone()
            to_number = self._format_phone_number(phone)
            
            msg = self.client.messages.create(
                body=message,
                from_=from_number,
                to=to_number
            )
            logger.info(f"WhatsApp message sent from {from_number} to {phone}: {msg.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message to {phone}: {str(e)}")
            return False

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
- RoadReady Team"""

            to_number = self._format_phone_number(student_phone)
            from_number = self.get_admin_twilio_sender_phone()

            message = self.client.messages.create(
                body=message_body, from_=from_number, to=to_number
            )

            logger.info(f"Booking confirmation sent from {from_number} to {student_name}: {message.sid}")
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
- RoadReady Team"""

            to_number = self._format_phone_number(student_phone)
            from_number = self.get_admin_twilio_sender_phone()

            message = self.client.messages.create(
                body=message_body, from_=from_number, to=to_number
            )

            logger.info(f"Student 1hr reminder sent from {from_number} to {student_name}: {message.sid}")
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

            maps_link = f"https://www.google.com/maps/search/?api=1&query={pickup_address.replace(' ', '+')}"

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

🗺️ Navigate to pickup:
{maps_link}

Drive Safe! 🚗
- RoadReady Team"""

            to_number = self._format_phone_number(instructor_phone)
            from_number = self.get_admin_twilio_sender_phone()

            message = self.client.messages.create(
                body=message_body, from_=from_number, to=to_number
            )

            logger.info(f"Instructor reminder sent from {from_number} to {instructor_name}: {message.sid}")
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

            maps_link = f"https://www.google.com/maps/search/?api=1&query={pickup_address.replace(' ', '+')}"

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

🗺️ Navigate to pickup:
{maps_link}

Drive Safe! 🚗
- RoadReady Team"""

            to_number = self._format_phone_number(instructor_phone)
            from_number = self.get_admin_twilio_sender_phone()

            message = self.client.messages.create(
                body=message_body, from_=from_number, to=to_number
            )

            logger.info(
                f"Same-day booking notification sent from {from_number} to {instructor_name}: {message.sid}"
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
- RoadReady Team"""

            to_number = self._format_phone_number(instructor_phone)
            from_number = self.get_admin_twilio_sender_phone()

            message = self.client.messages.create(
                body=message_body, from_=from_number, to=to_number
            )

            logger.info(f"Daily summary sent from {from_number} to {instructor_name}: {message.sid}")
            return True

        except Exception as e:
            logger.error(f"Failed to send daily summary: {str(e)}")
            return False

    def send_verification_message(
        self,
        phone: str,
        first_name: str,
        verification_link: str,
        validity_minutes: int
    ) -> bool:
        """
        Send verification message with clickable link
        
        Args:
            phone: Phone number in any format
            first_name: User's first name
            verification_link: Full verification URL
            validity_minutes: Link validity time in minutes
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.client:
            logger.warning("Twilio client not initialized. Skipping verification message.")
            return False

        try:
            to_number = self._format_phone_number(phone)
            from_number = self.get_admin_twilio_sender_phone()
            
            # Message body with clickable link
            message_body = (
                f"🎉 Welcome {first_name}!\n\n"
                f"Click here to verify your RoadReady account:\n"
                f"{verification_link}\n\n"
                f"⏰ Link expires in: {validity_minutes} minutes\n\n"
                f"Not you? Ignore this message."
            )
            
            # Send message (link will be clickable in WhatsApp)
            msg = self.client.messages.create(
                body=message_body,
                from_=from_number,
                to=to_number
            )
            
            logger.info(f"WhatsApp verification message sent to {phone}: {msg.sid}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send WhatsApp verification message to {phone}: {str(e)}")
            return False

    def send_admin_student_registration_notification(
        self,
        admin_phone: str,
        admin_name: str,
        student_name: str,
        student_email: str,
        student_phone: str
    ) -> bool:
        """
        Send notification to admin about new student registration
        
        Args:
            admin_phone: Admin's phone number
            admin_name: Admin's first name
            student_name: Student's full name
            student_email: Student's email
            student_phone: Student's phone
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.client:
            logger.warning("Twilio client not initialized. Skipping admin notification.")
            return False

        try:
            to_number = self._format_phone_number(admin_phone)
            from_number = self.get_admin_twilio_sender_phone()
            
            # Admin notification message (different from student verification)
            message_body = (
                f"👋 Hi {admin_name}!\n\n"
                f"🎓 New Student Registration:\n\n"
                f"📝 Name: {student_name}\n"
                f"📧 Email: {student_email}\n"
                f"📱 Phone: {student_phone}\n\n"
                f"⏳ Status: Awaiting verification\n\n"
                f"The student has been sent a verification link. "
                f"They will be able to book lessons once verified.\n\n"
                f"This is an automated notification from RoadReady."
            )
            
            # Send message
            msg = self.client.messages.create(
                body=message_body,
                from_=from_number,
                to=to_number
            )
            
            logger.info(f"Admin notification sent to {admin_phone}: {msg.sid}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send admin notification to {admin_phone}: {str(e)}")
            return False


# Global service instance
whatsapp_service = WhatsAppService()

