# 🚀 Getting Started - Driving School Booking App

## Quick Start (5 minutes)

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher  
- PostgreSQL database
- Git (optional)

### Option 1: Automated Setup (Windows)
```powershell
# Run the quick start script
.\quickstart.bat
```

### Option 2: Manual Setup

#### Step 1: Backend Setup
```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
copy .env.example .env

# Edit .env with your settings
notepad .env
```

**Required .env Configuration:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/driving_school_db
SECRET_KEY=your-secret-key-generate-with-python-secrets
STRIPE_SECRET_KEY=sk_test_...
PAYFAST_MERCHANT_ID=...
```

Generate SECRET_KEY:
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

#### Step 2: Database Setup
```powershell
# Create PostgreSQL database
createdb driving_school_db

# Or using psql
psql -U postgres
CREATE DATABASE driving_school_db;
\q
```

#### Step 3: Start Backend
```powershell
cd backend\app
uvicorn main:app --reload
```

Backend runs at: **http://localhost:8000**  
API Docs: **http://localhost:8000/docs**

#### Step 4: Frontend Setup
Open a new terminal:
```powershell
cd frontend

# Install dependencies
npm install

# Start Expo
npx expo start
```

Then:
- Press **`w`** for web browser
- Press **`a`** for Android emulator
- Press **`i`** for iOS simulator (macOS only)
- Scan QR code with Expo Go app on your phone

## 📱 Testing the App

### 1. Test Registration (Student)
1. Open the app
2. Click "Register"
3. Choose "Student"
4. Fill in the form:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Phone: 0821234567
   - ID Number: 9001015009087 (test)
   - Complete remaining fields
5. Click Register

### 2. Test Login
1. Email: john@example.com
2. Password: (your password)
3. Click Login

### 3. Test API Endpoints

Open **http://localhost:8000/docs** and try:

**Register Student:**
```json
POST /auth/register/student
{
  "email": "student@test.com",
  "phone": "0821234567",
  "password": "Test123!",
  "first_name": "Test",
  "last_name": "Student",
  "id_number": "9001015009087",
  "emergency_contact_name": "Emergency Contact",
  "emergency_contact_phone": "0821234568",
  "address_line1": "123 Main St",
  "city": "Cape Town",
  "province": "Western Cape",
  "postal_code": "8000"
}
```

**Login:**
```json
POST /auth/login
Form Data:
- username: student@test.com
- password: Test123!
```

**Get Current User:**
```json
GET /auth/me
Authorization: Bearer <your_token>
```

## 🔑 Payment Gateway Setup

### Stripe (International Payments)

1. **Create Account:**
   - Go to https://stripe.com
   - Sign up for free account

2. **Get Test Keys:**
   - Dashboard → Developers → API Keys
   - Copy "Publishable key" and "Secret key"

3. **Add to Configuration:**
   - Backend: Add to `.env`
   - Frontend: Add to `config.ts`

4. **Test Payments:**
   - Card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits

### PayFast (South African Payments)

1. **Create Account:**
   - Go to https://www.payfast.co.za
   - Register merchant account

2. **Get Sandbox Credentials:**
   - Dashboard → Settings → Sandbox
   - Copy Merchant ID and Merchant Key

3. **Add to Backend .env:**
```env
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your_passphrase
PAYFAST_MODE=sandbox
```

## 🗺️ Google Maps Setup (Optional)

For map features:

1. **Get API Key:**
   - Go to https://console.cloud.google.com
   - Create new project
   - Enable Maps SDK for Android/iOS
   - Create credentials → API Key

2. **Add to Frontend:**
   - Edit `frontend/app.json`
   - Add key to `android.config.googleMaps.apiKey`

## 📊 Database Management

### View Tables
```sql
psql -U postgres -d driving_school_db

-- List all tables
\dt

-- View users
SELECT * FROM users;

-- View bookings
SELECT * FROM bookings;
```

### Reset Database
```powershell
# Drop and recreate
dropdb driving_school_db
createdb driving_school_db

# Restart backend (will recreate tables)
```

## 🐛 Troubleshooting

### Backend Won't Start
```powershell
# Check Python version
python --version  # Should be 3.10+

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"
```

### Frontend Won't Start
```powershell
# Clear cache
npx expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install

# Check Node version
node --version  # Should be 18+
```

### Can't Connect to Backend
1. Check backend is running on port 8000
2. Update `frontend/config.ts`:
```typescript
const API_BASE_URL = 'http://localhost:8000';
```
3. For mobile device, use your computer's IP:
```typescript
const API_BASE_URL = 'http://192.168.1.100:8000';
```

### Database Connection Error
```powershell
# Check DATABASE_URL in .env
DATABASE_URL=postgresql://username:password@localhost:5432/driving_school_db

# Test connection
psql -U postgres -d driving_school_db
```

## 📚 Useful Commands

### Backend
```powershell
# Start with auto-reload
uvicorn main:app --reload

# Start on different port
uvicorn main:app --port 8001

# View logs
uvicorn main:app --log-level debug
```

### Frontend
```powershell
# Start Expo
npm start

# Start on web
npm run web

# Clear cache
npx expo start -c

# Install new package
npm install package-name
```

### Database
```powershell
# Backup database
pg_dump -U postgres driving_school_db > backup.sql

# Restore database
psql -U postgres driving_school_db < backup.sql

# Connect to database
psql -U postgres -d driving_school_db
```

## 🎯 Next Development Steps

1. **Complete Frontend Screens:**
   - Instructor list with map
   - Booking flow
   - Payment screens
   - Dashboards

2. **Add Features:**
   - WhatsApp notifications
   - Push notifications
   - Real-time tracking
   - Reviews and ratings

3. **Testing:**
   - Add unit tests
   - Add integration tests
   - Test on real devices

4. **Deployment:**
   - Setup production database
   - Deploy backend to cloud
   - Build mobile apps
   - Setup CI/CD

## 📖 Documentation

- **API Docs:** http://localhost:8000/docs
- **Implementation Summary:** See `IMPLEMENTATION_SUMMARY.md`
- **Phase 1 Complete:** See `PHASE_1_COMPLETE.md`
- **Project Status:** See `AGENTS.md`

## 💬 Support

**Common Issues:**
- Port already in use: Change port in uvicorn command
- Module not found: Reinstall dependencies
- Database error: Check PostgreSQL running
- CORS error: Check backend ALLOWED_ORIGINS

**Resources:**
- FastAPI Docs: https://fastapi.tiangolo.com
- React Native: https://reactnative.dev
- Expo Docs: https://docs.expo.dev
- Stripe API: https://stripe.com/docs/api
- PayFast API: https://developers.payfast.co.za

## ✅ Verification Checklist

- [ ] Python 3.10+ installed
- [ ] Node.js 18+ installed
- [ ] PostgreSQL running
- [ ] Backend .env configured
- [ ] Backend starts without errors
- [ ] Frontend dependencies installed
- [ ] Frontend starts without errors
- [ ] Can access API docs at /docs
- [ ] Can register a test user
- [ ] Can login successfully

---

**Ready to code!** 🎉

Start building Phase 2 features or customize the existing implementation.
