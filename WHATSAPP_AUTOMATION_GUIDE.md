# WhatsApp Automation Implementation Guide

## Overview

Complete WhatsApp automation system using Twilio Business API for the Drive Alive booking platform.

## Features Implemented ✅

### 1. Immediate Booking Confirmation

- Sent to student immediately after successful booking
- Includes booking reference, instructor name, date/time, pickup location, and total amount
- **Booking Fee**: R10 added to each booking (configured in .env)

### 2. Student Reminders (1 Hour Before Lesson)

- Automatic reminder sent 1 hour before lesson starts
- Includes lesson details and instructor contact information
- Runs every 5 minutes in background

### 3. Instructor Reminders (15 Minutes Before Lesson)

- Reminder sent to instructor 15 minutes before lesson
- Includes student details and contact information
- Separate tracking to avoid duplicate messages

### 4. Daily Summary for Instructors

- Sent every morning at 6:00 AM SAST
- Only sent if first lesson is more than 1 hour away
- Consolidates all lessons for the day in one message
- Includes student names, phone numbers, times, and pickup locations

## Configuration

### Environment Variables (.env)

```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886

# Booking Fee (in ZAR)
BOOKING_FEE=10.0
```

### Database Changes

New columns added to `bookings` table:

- `reminder_sent` (Boolean) - Tracks if student 1hr reminder was sent
- `instructor_reminder_sent` (Boolean) - Tracks if instructor 15min reminder was sent
- `daily_summary_sent` (Boolean) - Tracks if lesson was included in daily summary
- `booking_fee` (Float) - R10 fee per booking

## Files Created/Modified

### New Files

1. **backend/app/services/whatsapp_service.py**

   - WhatsApp service with Twilio integration
   - Phone number formatting (supports +27, 27, 0 formats)
   - Message templates for confirmations, reminders, and summaries

2. **backend/app/services/reminder_scheduler.py**

   - Background task scheduler
   - Checks every 5 minutes for pending reminders
   - Daily summary at 6:00 AM SAST
   - Timezone-aware (SAST UTC+2)

3. **backend/migrations/add_whatsapp_reminders.py**
   - Database migration script
   - Run: `python backend/migrations/add_whatsapp_reminders.py`

### Modified Files

1. **backend/.env** - Added Twilio credentials and booking fee
2. **backend/app/config.py** - Added BOOKING_FEE setting
3. **backend/app/models/booking.py** - Added WhatsApp tracking columns
4. **backend/app/schemas/booking.py** - Added booking_fee to response schema
5. **backend/app/routes/bookings.py** - Integrated WhatsApp confirmation on booking
6. **backend/app/main.py** - Added lifespan context manager for background scheduler

## How It Works

### Booking Flow

1. Student creates booking via API
2. Booking fee (R10) automatically added to total amount
3. WhatsApp confirmation sent immediately to student
4. Booking saved with `reminder_sent=False`, `instructor_reminder_sent=False`, `daily_summary_sent=False`

### Background Scheduler

Runs continuously in background, checking every 5 minutes:

**Student Reminders (1 Hour Before)**

- Finds bookings with lesson_date in 55-65 minute window
- Sends reminder if `reminder_sent=False`
- Marks `reminder_sent=True` after successful send

**Instructor Reminders (15 Minutes Before)**

- Finds bookings with lesson_date in 12.5-17.5 minute window
- Sends reminder if `instructor_reminder_sent=False`
- Marks `instructor_reminder_sent=True` after successful send

**Daily Summary (6:00 AM SAST)**

- Runs between 6:00-6:10 AM
- Groups today's bookings by instructor
- Sends one message per instructor with all lessons
- Only sends if first lesson is 60+ minutes away
- Marks all bookings as `daily_summary_sent=True`

## Testing

### 1. Run Migration

```bash
cd C:\Projects\DRIVE_ALIVE\backend
venv\Scripts\python.exe migrations\add_whatsapp_reminders.py
```

### 2. Start Backend

```bash
cd C:\Projects\DRIVE_ALIVE
.\scripts\drive-alive.bat start -d
```

Expected output:

```
Drive Alive Backend API - Starting Up
WhatsApp Reminders: Enabled
🚀 Starting WhatsApp reminder scheduler...
Reminder scheduler initialized
```

### 3. Test Booking Confirmation

Create a booking via API and check:

- Student receives immediate WhatsApp confirmation
- Booking amount = lesson cost + R10 booking fee
- Console logs: "Booking confirmation sent to [student name]: [Twilio SID]"

### 4. Test Reminders

Create booking for 1 hour from now:

- Wait for background task to run (every 5 minutes)
- Student should receive reminder at 1 hour before
- Instructor should receive reminder at 15 minutes before
- Check console logs for confirmation

### 5. Test Daily Summary

Create multiple bookings for tomorrow:

- Change system time to 6:00 AM next day (or wait)
- Instructor should receive consolidated message with all lessons
- Each lesson shows time, student name, phone, and pickup address

## Twilio Sandbox Testing

Before purchasing Twilio number:

1. Use sandbox number: `whatsapp:+14155238886`
2. Students/instructors must join sandbox by sending "join [code]" to Twilio number
3. Free $15 credit for testing
4. Limited to verified phone numbers

## Production Setup

1. Purchase Twilio WhatsApp number ($1.50/month)
2. Update `TWILIO_WHATSAPP_NUMBER` in .env
3. No need for recipients to join sandbox
4. Unlimited recipients (charged per message)

## Cost Breakdown (1000 Bookings/Month)

- **Immediate confirmations**: 1000 messages × R0.165 = R165
- **Student reminders**: 1000 messages × R0.165 = R165
- **Instructor reminders**: ~1000 messages × R0.165 = R165 (varies by instructor count)
- **Daily summaries**: ~30 messages/month × R0.165 = R5
- **Total**: ~R500/month (~$26.60 USD)
- **Revenue from R10 booking fee**: 1000 × R10 = **R10,000/month**
- **Net Profit**: R9,500/month (95% margin)

## Message Templates

### Booking Confirmation

```
✅ Booking Confirmed!

Hello [Student Name],

Your driving lesson has been booked successfully.

📋 Booking Details:
• Reference: BK12345678
• Instructor: [Instructor Name]
• Date: Monday, 13 January 2026
• Time: 02:00 PM
• Pickup: [Address]
• Amount: R220.00

You will receive a reminder 1 hour before your lesson.

Drive Safe! 🚗
- Drive Alive Team
```

### Student Reminder (1 Hour Before)

```
⏰ Lesson Reminder

Hello [Student Name],

Your driving lesson starts in 1 hour!

📋 Lesson Details:
• Instructor: [Instructor Name]
• Time: 02:00 PM
• Pickup: [Address]

📞 Instructor Contact: [Phone]

Please be ready 5 minutes early.

See you soon! 🚗
- Drive Alive Team
```

### Instructor Reminder (15 Minutes Before)

```
⏰ Next Lesson in 15 Minutes

Hello [Instructor Name],

Your next lesson starts soon!

📋 Lesson Details:
• Student: [Student Name]
• Time: 02:00 PM
• Pickup: [Address]

📞 Student Contact: [Phone]

See you soon! 🚗
- Drive Alive Team
```

### Daily Summary (6:00 AM)

```
📅 Today's Schedule

Hello [Instructor Name],

Here are your lessons for today:

1. 08:00 AM - John Doe
   📍 123 Main Street, Pretoria
   📞 0821234567

2. 10:00 AM - Jane Smith
   📍 456 Oak Avenue, Centurion
   📞 0829876543

3. 02:00 PM - Bob Johnson
   📍 789 Park Road, Johannesburg
   📞 0825556677

Have a great day! 🚗
- Drive Alive Team
```

## Troubleshooting

### Issue: WhatsApp messages not sending

**Solution**: Check console logs for error messages. Verify Twilio credentials in .env.

### Issue: Reminders sent late/early

**Solution**: Check timezone configuration. Ensure lesson_date is stored correctly in database.

### Issue: Duplicate messages

**Solution**: Verify reminder_sent flags are being set. Check scheduler interval (should be 5 minutes).

### Issue: Daily summary not sending

**Solution**: Ensure scheduler runs at 6:00 AM SAST. Check daily_summary_sent flag is reset daily.

## Next Steps (Optional Enhancements)

1. Add opt-out functionality for students who don't want reminders
2. Implement custom message templates via admin dashboard
3. Add SMS fallback for users without WhatsApp
4. Track message delivery status via Twilio webhooks
5. Send cancellation notifications
6. Add rescheduling confirmation messages

## Support

For Twilio support: https://www.twilio.com/docs/whatsapp
For Drive Alive issues: Check backend console logs and error.log file
