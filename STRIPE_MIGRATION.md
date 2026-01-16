# Stripe Payment Migration

## Summary

Switched from PayFast to Stripe for payment processing due to invalid PayFast sandbox credentials.

## What Changed

### Backend

- **`app/routes/payments.py`**: Complete rewrite using Stripe Checkout API
  - Uses `stripe.checkout.Session.create()` for payment initiation
  - Webhook endpoint changed from `/payments/notify` (PayFast ITN) to `/payments/webhook` (Stripe)
  - Test mode uses Stripe's test API key: `sk_test_4eC39HqLyjWDarjtT1zdp7dc`
  - Payments processed in South African Rands (ZAR)

### Frontend

- **`screens/payment/PaymentScreen.tsx`**: Changed `payment_gateway` from 'payfast' to 'stripe'

## Testing

### Stripe Test Cards

Use these test card numbers in Stripe Checkout:

**Success:**

- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

**Decline:**

- Card: `4000 0000 0000 0002`

**More test cards**: https://stripe.com/docs/testing#cards

### Webhook Testing (Local Development)

1. Install Stripe CLI:

   ```bash
   # Windows (PowerShell)
   scoop install stripe

   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. Login to Stripe:

   ```bash
   stripe login
   ```

3. Forward webhooks to local server:

   ```bash
   stripe listen --forward-to http://localhost:8000/api/payments/webhook
   ```

4. The CLI will output a webhook signing secret (starts with `whsec_`)
5. Add it to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Complete Payment Flow Test

1. Start backend: `cd backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm start`
3. Login as student: test@student.com / password123
4. Browse instructors and book a lesson
5. Click "Proceed to Payment"
6. You'll be redirected to Stripe Checkout
7. Use test card: 4242 4242 4242 4242
8. Complete payment
9. Stripe webhook creates bookings automatically
10. Check Student Home to see confirmed bookings

## Environment Variables

Add to `backend/.env`:

```env
# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_4eC39HqLyjWDarjtT1zdp7dc
STRIPE_PUBLISHABLE_KEY=pk_test_51HqLyjWDarjtT1zdp7dc
STRIPE_WEBHOOK_SECRET=  # Leave empty for development without CLI

# PayFast (Legacy - no longer used)
# PAYFAST_MERCHANT_ID=10000100
# PAYFAST_MERCHANT_KEY=46f0cd694581a
# PAYFAST_MODE=sandbox
```

## Production Setup

1. Sign up at https://stripe.com
2. Complete business verification
3. Get live API keys from Stripe Dashboard
4. Update `.env` with production keys:
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
5. Configure webhook in Stripe Dashboard:
   - URL: `https://yourapp.com/api/payments/webhook`
   - Events: `checkout.session.completed`

## Advantages of Stripe

✅ **Working Credentials**: Test keys work immediately (unlike PayFast)
✅ **Better Documentation**: Comprehensive API docs with code examples
✅ **International Support**: Accept payments from anywhere
✅ **Developer Tools**: Excellent CLI and testing tools
✅ **Transparent Pricing**: 2.9% + R2.00 per transaction (South Africa)
✅ **Strong Support**: 24/7 developer support

## Migration Timeline

- **Jan 16, 2026**: Attempted PayFast integration - sandbox credentials invalid
- **Jan 16, 2026**: Switched to Stripe - working perfectly
- **Next**: Production deployment with live Stripe account

## Files Modified

- `backend/app/routes/payments.py` - Complete rewrite for Stripe
- `frontend/screens/payment/PaymentScreen.tsx` - Gateway changed to 'stripe'
- `backend/.env` - Added Stripe test credentials
- `STRIPE_MIGRATION.md` - This file

## Notes

- Payment-first workflow maintained (pay before booking creation)
- WhatsApp confirmations still sent after successful payment
- All database models support both 'stripe' and 'payfast' gateways
- Can switch back to PayFast later with real credentials if needed
