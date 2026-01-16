# PayFast Payment Integration - Implementation Guide

## Overview

This implementation adds **payment-first workflow** using PayFast for the Drive Alive driving school booking app. Students must pay the R10 booking fee **before** lessons are confirmed and WhatsApp notifications are sent.

---

## Payment Flow

### Before (Old Flow - Removed)

```
Student selects slots → Books lesson → Booking created → WhatsApp sent → Payment pending
```

### After (New Flow - Implemented)

```
Student selects slots → Payment screen → PayFast payment →
Payment success → Bookings created → WhatsApp confirmations sent
```

---

## Key Features

✅ **Payment-First**: No bookings created until payment confirmed
✅ **PayFast Integration**: Free South African payment gateway
✅ **R10 Booking Fee**: Per-booking fee (configurable in `.env`)
✅ **Multi-Booking Support**: Pay for multiple lessons in one transaction
✅ **Webhook Handling**: Automatic booking creation after payment
✅ **WhatsApp Notifications**: Sent only after successful payment
✅ **Payment Session Tracking**: Each payment tracked with unique session ID
✅ **Success/Cancel Handling**: Proper redirects for both scenarios

---

## Implementation Details

### Backend Changes

#### 1. New Payment Models

- **`PaymentSession`** (`backend/app/models/payment_session.py`)
  - Stores pending payment details before bookings are created
  - Fields: `payment_session_id`, `user_id`, `instructor_id`, `bookings_data`, `amount`, `booking_fee`, `total_amount`, `status`
  - Status: `pending` → `completed` after PayFast confirmation

#### 2. Payment Routes (`backend/app/routes/payments.py`)

**`POST /payments/initiate`**

- Creates payment session with booking data (not saved to bookings table yet)
- Generates PayFast payment URL with signature
- Returns payment URL for frontend redirect

**`POST /payments/notify`** (PayFast ITN Webhook)

- Called by PayFast when payment completes
- Verifies payment status (`COMPLETE`)
- Creates all bookings from payment session
- Sends WhatsApp confirmations
- Marks payment session as `completed`

**`GET /payments/session/{payment_session_id}`**

- Check payment session status (for polling on success screen)

#### 3. Payment Schemas (`backend/app/schemas/payment.py`)

- `PaymentInitiateRequest`: Request to start payment
- `PaymentInitiateResponse`: Payment URL and session details
- `PayFastNotification`: PayFast ITN data structure

#### 4. Database Migration

- Run `python backend/migrations/add_payment_sessions.py` to create `payment_sessions` table

---

### Frontend Changes

#### 1. PaymentScreen (`frontend/screens/payment/PaymentScreen.tsx`)

- Displays booking summary with instructor info
- Shows pricing breakdown (lessons + booking fee)
- Redirects to PayFast payment page
- Stores `payment_session_id` in localStorage (web) for later verification

#### 2. PaymentSuccessScreen (`frontend/screens/payment/PaymentSuccessScreen.tsx`)

- Polls backend to verify payment completion (max 10 attempts, 2s interval)
- Shows success message when payment confirmed
- Redirects to Student Home after confirmation

#### 3. PaymentCancelScreen (`frontend/screens/payment/PaymentCancelScreen.tsx`)

- Shown when user cancels payment at PayFast
- Offers retry or return to home
- Cleans up payment session ID from storage

#### 4. BookingScreen Updates (`frontend/screens/booking/BookingScreen.tsx`)

- Changed button text: `"📅 Confirm Booking"` → `"💳 Proceed to Payment"`
- Navigation: Goes to `PaymentScreen` instead of directly creating bookings
- Passes booking data to payment screen for initiation

#### 5. API Service Updates (`frontend/services/api/index.ts`)

- Added `initiatePayment()` method
- Added `getPaymentSession()` method for status checking

#### 6. App Navigation (`frontend/App.tsx`)

- Added `PaymentScreen`, `PaymentSuccessScreen`, `PaymentCancelScreen` to navigation stack
- Return URLs configured for PayFast redirects

---

## Configuration

### Environment Variables (`.env`)

```env
# PayFast Settings
PAYFAST_MERCHANT_ID=10000100  # Sandbox: 10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a  # Sandbox: 46f0cd694581a
PAYFAST_PASSPHRASE=  # Leave empty for sandbox
PAYFAST_MODE=sandbox  # Use 'live' for production

# Booking Fee
BOOKING_FEE=10.0  # R10 per booking

# Return URLs (must match your frontend URL)
ALLOWED_ORIGINS=http://localhost:8081  # Used for return/cancel URLs
```

---

## PayFast Sandbox Testing

### Sandbox Credentials (Free Forever)

- **Merchant ID**: `10000100`
- **Merchant Key**: `46f0cd694581a`
- **Passphrase**: Leave empty
- **URL**: `https://sandbox.payfast.co.za/eng/process`

### Test Payment Details

- **Amount**: Any amount (R10 or more)
- **Card**: Use sandbox test cards (no real money charged)
- **Instant EFT**: Use test bank credentials

### Sandbox Mode Features

- ✅ No real money transactions
- ✅ Full API testing
- ✅ ITN webhook testing (use ngrok for local testing)
- ✅ Payment flow testing without bank account

---

## Production Deployment

### Steps to Go Live

1. **Sign up at PayFast**
   Visit [https://www.payfast.co.za](https://www.payfast.co.za) and create a merchant account.

2. **Update `.env` with Live Credentials**

   ```env
   PAYFAST_MERCHANT_ID=your_live_merchant_id
   PAYFAST_MERCHANT_KEY=your_live_merchant_key
   PAYFAST_PASSPHRASE=your_live_passphrase
   PAYFAST_MODE=live
   ```

3. **Update Return URLs**

   - `return_url`: `https://yourdomain.com/payment/success`
   - `cancel_url`: `https://yourdomain.com/payment/cancel`
   - `notify_url`: `https://yourdomain.com/api/payments/notify` (must be HTTPS!)

4. **Configure ITN (Important!)**

   - PayFast requires HTTPS for webhooks
   - Use ngrok or deploy to HTTPS-enabled server
   - Test ITN with PayFast sandbox first

5. **Enable Signature Verification (Production)**
   - Uncomment signature verification in `backend/app/routes/payments.py`:
     ```python
     if not verify_payfast_signature(data, settings.PAYFAST_PASSPHRASE or ""):
         raise HTTPException(status_code=400, detail="Invalid signature")
     ```

---

## Testing Workflow

### Local Development

1. **Start Backend**

   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Start Frontend**

   ```bash
   cd frontend
   npx expo start
   ```

3. **Test Payment Flow**
   - Login as student
   - Select instructor and time slots
   - Click "Proceed to Payment"
   - On PaymentScreen, click "Pay R10.00"
   - Redirected to PayFast sandbox
   - Complete payment (use test credentials)
   - Redirected back to success screen
   - Verify bookings created and WhatsApp sent

### Testing ITN Webhook Locally

1. **Install ngrok**

   ```bash
   ngrok http 8000
   ```

2. **Update `notify_url` in `payments.py`**

   ```python
   "notify_url": "https://your-ngrok-url.ngrok.io/api/payments/notify"
   ```

3. **Test PayFast ITN**
   - Complete payment on sandbox
   - PayFast sends ITN to ngrok URL
   - Check backend logs for "📧 PayFast ITN received"

---

## Security Notes

### ⚠️ Important Security Measures

1. **Signature Verification**

   - Currently commented out for sandbox testing
   - **MUST enable in production** to prevent fraud

2. **HTTPS Requirement**

   - PayFast requires HTTPS for `notify_url`
   - Use SSL certificate in production

3. **Payment Session Validation**

   - Each payment session has unique ID
   - Prevents duplicate booking creation

4. **Status Checks**
   - Only `payment_status === 'COMPLETE'` creates bookings
   - Prevents partial/failed payments from creating bookings

---

## Troubleshooting

### Payment Not Completing

**Symptom**: Payment successful at PayFast but bookings not created

**Solutions**:

1. Check backend logs for ITN webhook errors
2. Verify `notify_url` is accessible (use ngrok for local testing)
3. Check payment session status: `GET /payments/session/{payment_session_id}`
4. Ensure PayFast sends ITN (check PayFast dashboard)

### WhatsApp Not Sent After Payment

**Symptom**: Bookings created but no WhatsApp confirmation

**Solutions**:

1. Check Twilio credentials in `.env`
2. Verify `TWILIO_WHATSAPP_NUMBER` format: `whatsapp:+27XXXXXXXXX`
3. Check backend logs for WhatsApp errors
4. Verify phone numbers are valid South African numbers

### Payment Polling Timeout

**Symptom**: Success screen shows "Payment Status Unknown"

**Solutions**:

1. Check ITN webhook received by backend
2. Increase polling attempts in `PaymentSuccessScreen.tsx`
3. Manually verify payment session status in database

---

## Cost Analysis

### PayFast Fees (South Africa)

- **Setup Fee**: R0 (Free)
- **Monthly Fee**: R0 (Free)
- **Transaction Fee**: 2.9% + R2.00 per transaction

### Example Costs

| Booking Scenario | Amount | PayFast Fee | Student Pays |
| ---------------- | ------ | ----------- | ------------ |
| 1 Lesson (R10)   | R10.00 | R2.29       | R10.00       |
| 2 Lessons (R20)  | R20.00 | R2.58       | R20.00       |
| 5 Lessons (R50)  | R50.00 | R3.45       | R50.00       |

**Note**: Instructor absorbs transaction fee unless you add it to booking fee.

---

## Alternative Payment Gateways (Future)

### Ozow (Instant EFT Only)

- **Pros**: Lower fees (1.5-2.5%), instant transfers
- **Cons**: No credit card support, R50 minimum

### Stripe (Global)

- **Pros**: Excellent API, global support
- **Cons**: Higher fees in SA (2.9% + R5), USD conversion

### Recommendation

**Use PayFast** for South African market:

- Supports all local banks (Instant EFT)
- Accepts credit/debit cards
- R10 minimum works (Ozow requires R50)
- Free to start, South African company

---

## Files Modified/Created

### Backend

- ✅ `backend/app/models/payment_session.py` (new)
- ✅ `backend/app/schemas/payment.py` (new)
- ✅ `backend/app/routes/payments.py` (rewritten)
- ✅ `backend/app/models/__init__.py` (updated imports)
- ✅ `backend/migrations/add_payment_sessions.py` (new)

### Frontend

- ✅ `frontend/screens/payment/PaymentScreen.tsx` (rewritten)
- ✅ `frontend/screens/payment/PaymentSuccessScreen.tsx` (new)
- ✅ `frontend/screens/payment/PaymentCancelScreen.tsx` (new)
- ✅ `frontend/screens/booking/BookingScreen.tsx` (updated)
- ✅ `frontend/services/api/index.ts` (added payment methods)
- ✅ `frontend/App.tsx` (added payment screens to navigation)

---

## Next Steps

1. **Run Database Migration**

   ```bash
   cd backend
   python migrations/add_payment_sessions.py
   ```

2. **Test Payment Flow**

   - Use sandbox credentials
   - Test single and multi-booking payments
   - Verify WhatsApp confirmations

3. **Deploy to Production**

   - Update PayFast credentials
   - Enable HTTPS for ITN webhooks
   - Enable signature verification

4. **Monitor Transactions**
   - Check PayFast dashboard for successful payments
   - Monitor database for payment session completion rates

---

## Support

For PayFast-specific issues:

- Documentation: https://developers.payfast.co.za
- Support: support@payfast.co.za
- Sandbox: https://sandbox.payfast.co.za

For app-specific issues:

- Check backend logs: `backend/app/routes/payments.py`
- Check frontend console: Browser DevTools
- Review AGENTS.md for system architecture

---

**Implementation Date**: January 16, 2026
**Status**: ✅ Complete and Ready for Testing
