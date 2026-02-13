"""
Background scheduler for sending WhatsApp reminders
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.booking import Booking, BookingStatus
from .whatsapp_service import whatsapp_service

logger = logging.getLogger(__name__)


class ReminderScheduler:
    """Background task scheduler for WhatsApp reminders"""

    def __init__(self):
        """Initialize the scheduler"""
        self.running = False
        logger.info("Reminder scheduler initialized")

    async def start(self):
        """Start the background reminder task"""
        self.running = True
        logger.info("🚀 Starting reminder scheduler...")
        print("🚀 WhatsApp Reminder Scheduler STARTED - checking every 5 minutes")

        while self.running:
            try:
                logger.info("⏰ Running reminder check cycle...")
                print(
                    f"⏰ [{datetime.now().strftime('%H:%M:%S')}] Running reminder check..."
                )
                await self._check_reminders()
                await self._check_daily_summaries()
                # Check every 5 minutes
                logger.info("💤 Sleeping for 5 minutes until next check...")
                await asyncio.sleep(300)

            except Exception as e:
                logger.error(f"Error in reminder scheduler: {str(e)}")
                print(f"❌ Error in reminder scheduler: {str(e)}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying

    async def stop(self):
        """Stop the background reminder task"""
        logger.info("Stopping reminder scheduler...")
        self.running = False

    async def _check_reminders(self):
        """Check for bookings needing reminders"""
        db: Session = SessionLocal()
        try:
            now = datetime.now(timezone.utc)

            # Get current time in SAST (UTC+2)
            sast_now = now + timedelta(hours=2)

            # Convert to naive datetime for SQLite comparison (SQLite doesn't store timezone)
            sast_now_naive = sast_now.replace(tzinfo=None)

            # Student reminders (1 hour before lesson)
            # Send reminder when lesson is 55-65 minutes away (10-minute window to catch it)
            student_reminder_target = sast_now_naive + timedelta(hours=1)
            student_reminder_start = student_reminder_target - timedelta(
                minutes=5
            )  # 55 minutes away
            student_reminder_end = student_reminder_target + timedelta(
                minutes=5
            )  # 65 minutes away

            # Instructor reminders (15 minutes before)
            instructor_reminder_time = sast_now_naive + timedelta(minutes=15)
            instructor_reminder_start = instructor_reminder_time - timedelta(
                minutes=2.5
            )
            instructor_reminder_end = instructor_reminder_time + timedelta(minutes=2.5)

            logger.info(f"📅 Reminder check: SAST now = {sast_now_naive}")
            logger.info(
                f"   Student reminders: looking for lessons in 1 hour (between {student_reminder_start} and {student_reminder_end})"
            )
            logger.info(
                f"   Instructor reminders: looking for lessons in 15 minutes (between {instructor_reminder_start} and {instructor_reminder_end})"
            )

            # Find bookings needing student reminders (1 hour before)
            # Only send if lesson is approximately 1 hour away (55-65 minute window)
            student_bookings = (
                db.query(Booking)
                .filter(
                    Booking.lesson_date >= student_reminder_start,
                    Booking.lesson_date <= student_reminder_end,
                    Booking.status.in_(
                        [BookingStatus.CONFIRMED, BookingStatus.PENDING]
                    ),
                    Booking.reminder_sent == False,
                )
                .all()
            )

            logger.info(
                f"📱 Found {len(student_bookings)} bookings needing student reminders (1h before)"
            )
            for b in student_bookings:
                logger.info(
                    f"   - Booking {b.booking_reference}: {b.lesson_date} (reminder_sent={b.reminder_sent})"
                )

            for booking in student_bookings:
                await self._send_student_reminder(booking, db)

            # Find bookings needing instructor reminders (15 minutes before)
            instructor_bookings = (
                db.query(Booking)
                .filter(
                    Booking.lesson_date >= instructor_reminder_start,
                    Booking.lesson_date <= instructor_reminder_end,
                    Booking.status.in_(
                        [BookingStatus.CONFIRMED, BookingStatus.PENDING]
                    ),
                    Booking.instructor_reminder_sent == False,
                )
                .all()
            )

            logger.info(
                f"👨‍🏫 Found {len(instructor_bookings)} bookings needing instructor reminders (15min before)"
            )

            for booking in instructor_bookings:
                await self._send_instructor_reminder(booking, db)

            if len(student_bookings) > 0 or len(instructor_bookings) > 0:
                logger.info(
                    f"✅ Reminder check complete: {len(student_bookings)} student reminders (1h before), "
                    f"{len(instructor_bookings)} instructor reminders (15min before) sent"
                )
            else:
                logger.info(
                    f"⏳ Reminder check complete: No reminders to send (will check again in 5 min)"
                )

        except Exception as e:
            logger.error(f"Error checking reminders: {str(e)}")
        finally:
            db.close()

    async def _send_student_reminder(self, booking: Booking, db: Session):
        """Send reminder to student"""
        try:
            # Access user details through the user relationship
            student_user = booking.student.user
            instructor_user = booking.instructor.user

            success = whatsapp_service.send_student_reminder(
                student_name=f"{student_user.first_name} {student_user.last_name}",
                student_phone=student_user.phone,
                instructor_name=f"{instructor_user.first_name} {instructor_user.last_name}",
                instructor_phone=instructor_user.phone,
                lesson_date=booking.lesson_date,
                pickup_address=booking.pickup_address,
                booking_reference=booking.booking_reference,
                student_notes=booking.student_notes,
            )

            if success:
                booking.reminder_sent = True
                db.commit()
                logger.info(
                    f"✅ Student reminder sent for booking {booking.booking_reference}"
                )

        except Exception as e:
            logger.error(
                f"❌ Failed to send student reminder for booking {booking.id}: {str(e)}"
            )
            db.rollback()

    async def _send_instructor_reminder(self, booking: Booking, db: Session):
        """Send reminder to instructor"""
        try:
            # Access user details through the user relationship
            student_user = booking.student.user
            instructor_user = booking.instructor.user

            success = whatsapp_service.send_instructor_reminder(
                instructor_name=f"{instructor_user.first_name} {instructor_user.last_name}",
                instructor_phone=instructor_user.phone,
                student_name=f"{student_user.first_name} {student_user.last_name}",
                student_phone=student_user.phone,
                lesson_date=booking.lesson_date,
                pickup_address=booking.pickup_address,
                booking_reference=booking.booking_reference,
                student_notes=booking.student_notes,
            )

            if success:
                booking.instructor_reminder_sent = True
                db.commit()
                logger.info(
                    f"✅ Instructor reminder sent for booking {booking.booking_reference}"
                )

        except Exception as e:
            logger.error(
                f"Failed to send instructor reminder for booking {booking.id}: {str(e)}"
            )
            db.rollback()

    async def _check_daily_summaries(self):
        """Check for instructors needing daily summaries at 5:00 AM SAST"""
        db: Session = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            sast_now = now + timedelta(hours=2)

            # Check if it's between 5:00 AM and 5:10 AM SAST
            if not (sast_now.hour == 5 and sast_now.minute < 10):
                return

            # Get today's date in SAST
            today_start = sast_now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)

            # Find all bookings for today
            today_bookings = (
                db.query(Booking)
                .filter(
                    Booking.lesson_date >= today_start,
                    Booking.lesson_date < today_end,
                    Booking.status.in_(
                        [BookingStatus.CONFIRMED, BookingStatus.PENDING]
                    ),
                    Booking.daily_summary_sent == False,
                )
                .order_by(Booking.instructor_id, Booking.lesson_date)
                .all()
            )

            # Group by instructor
            instructor_bookings = {}
            for booking in today_bookings:
                instructor_id = booking.instructor_id
                if instructor_id not in instructor_bookings:
                    instructor_bookings[instructor_id] = []
                instructor_bookings[instructor_id].append(booking)

            # Send summary to each instructor
            for instructor_id, bookings in instructor_bookings.items():
                await self._send_daily_summary(bookings, db)

            logger.info(
                f"Daily summaries sent to {len(instructor_bookings)} instructors"
            )

        except Exception as e:
            logger.error(f"Error checking daily summaries: {str(e)}")
        finally:
            db.close()

    async def _send_daily_summary(self, bookings: list[Booking], db: Session):
        """Send daily summary to instructor"""
        try:
            if not bookings:
                return

            first_booking = bookings[0]
            instructor = first_booking.instructor
            instructor_user = instructor.user

            # Build summary message
            summary_lines = []
            for idx, booking in enumerate(bookings, 1):
                lesson_time = booking.lesson_date.strftime("%I:%M %p")
                student_user = booking.student.user
                student_name = f"{student_user.first_name} {student_user.last_name}"
                maps_link = f"https://www.google.com/maps/search/?api=1&query={booking.pickup_address.replace(' ', '+')}"
                summary_lines.append(
                    f"{idx}. {lesson_time} - {student_name} (Ref: {booking.booking_reference})\n   📍 {booking.pickup_address}\n   📞 {student_user.phone}\n   🗺️ {maps_link}"
                )

            bookings_summary = "\n\n".join(summary_lines)

            # Get time of first lesson - make it naive for comparison
            first_lesson_time = bookings[0].lesson_date
            if hasattr(first_lesson_time, "tzinfo") and first_lesson_time.tzinfo:
                first_lesson_time = first_lesson_time.replace(tzinfo=None)

            # Only send if first lesson is more than 1 hour away
            now = datetime.now(timezone.utc)
            sast_now = now + timedelta(hours=2)
            sast_now_naive = sast_now.replace(tzinfo=None)
            time_until_first = (first_lesson_time - sast_now_naive).total_seconds() / 60

            if time_until_first < 60:
                logger.info(
                    f"Skipping daily summary for instructor {instructor.id} - first lesson too soon"
                )
                return

            success = whatsapp_service.send_daily_summary(
                instructor_name=f"{instructor_user.first_name} {instructor_user.last_name}",
                instructor_phone=instructor_user.phone,
                bookings_summary=bookings_summary,
            )

            if success:
                # Mark all bookings as summary sent
                for booking in bookings:
                    booking.daily_summary_sent = True
                db.commit()
                logger.info(f"Daily summary sent to instructor {instructor.id}")

        except Exception as e:
            logger.error(f"Failed to send daily summary: {str(e)}")
            db.rollback()


# Global scheduler instance
reminder_scheduler = ReminderScheduler()
