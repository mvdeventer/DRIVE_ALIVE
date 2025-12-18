# Testing Frontend & Backend - Quick Guide

## ✅ Test Both (Easiest)

Run this to start both backend and frontend:
```bash
cd C:\Projects\DRIVE_ALIVE
test-both.bat
```

This opens 2 terminal windows:
- **Backend:** http://localhost:8000/docs
- **Frontend:** http://localhost:8081

---

## Test Backend Only

```bash
cd C:\Projects\DRIVE_ALIVE
test-backend.bat
```

### What to Check:
1. ✅ Server starts without errors
2. ✅ Shows: "Uvicorn running on http://0.0.0.0:8000"
3. ✅ Open browser: http://localhost:8000/docs
4. ✅ See FastAPI Swagger UI
5. ✅ Test endpoints (try GET /api/health)

### Expected Output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

---

## Test Frontend Only

```bash
cd C:\Projects\DRIVE_ALIVE
test-frontend.bat
```

### What to Check:
1. ✅ Expo starts without errors
2. ✅ QR code appears
3. ✅ Browser opens at http://localhost:8081
4. ✅ Press `w` to open web version
5. ✅ See login/register screens

### Expected Output:
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above
```

---

## Manual Testing

### Backend:
```bash
cd C:\Projects\DRIVE_ALIVE\backend
venv\Scripts\activate
cd app
uvicorn main:app --reload
```

### Frontend:
```bash
cd C:\Projects\DRIVE_ALIVE\frontend
npm start
```

---

## Testing Checklist

### Backend ✅
- [ ] Backend starts without errors
- [ ] API docs accessible at /docs
- [ ] Health endpoint responds: GET /api/health
- [ ] Can register a user: POST /auth/register/student
- [ ] Can login: POST /auth/login
- [ ] JWT token is returned

### Frontend ✅
- [ ] Expo starts without errors
- [ ] Web version opens (press w)
- [ ] Login screen appears
- [ ] Register screen works
- [ ] Can switch between screens
- [ ] No console errors

### Integration ✅
- [ ] Frontend can call backend APIs
- [ ] Login request reaches backend
- [ ] Registration works end-to-end
- [ ] JWT token is stored
- [ ] Protected routes work

---

## Testing API Endpoints

### Using Browser (Swagger UI):
1. Open: http://localhost:8000/docs
2. Try: GET /api/health
3. Click "Try it out"
4. Click "Execute"
5. See response

### Using curl:
```bash
# Health check
curl http://localhost:8000/api/health

# Register student
curl -X POST http://localhost:8000/auth/register/student \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","first_name":"John","last_name":"Doe","phone":"+27821234567","id_number":"9001015009087"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

## Common Issues

### Backend Issues:

**Port 8000 already in use:**
```bash
# Find process
netstat -ano | findstr :8000
# Kill it
taskkill /PID <pid> /F
```

**Virtual environment not activated:**
```bash
cd backend
venv\Scripts\activate
```

**Database connection error:**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env

### Frontend Issues:

**Port 8081 already in use:**
```bash
npx expo start -c
```

**Expo not found:**
```bash
npm install
```

**Cannot connect to backend:**
- Check backend is running on port 8000
- Update API_BASE_URL in frontend/config.ts

---

## Success Indicators

### Backend Running Successfully:
```
✓ Virtual environment activated
✓ FastAPI imports working
✓ Database connected
✓ Server running on http://0.0.0.0:8000
✓ Swagger UI accessible
✓ Health endpoint returns 200 OK
```

### Frontend Running Successfully:
```
✓ Node modules installed
✓ Expo CLI found
✓ Metro bundler started
✓ QR code displayed
✓ Web version opens
✓ Login screen renders
✓ No fatal errors in console
```

---

## Next Steps After Testing

If both work:
1. ✅ Backend API is ready
2. ✅ Frontend app is ready
3. ⏳ Start implementing missing UI screens
4. ⏳ Add map view for instructors
5. ⏳ Build booking flow
6. ⏳ Integrate payment UI

---

## Quick Commands Reference

```bash
# Start both
test-both.bat

# Backend only
test-backend.bat

# Frontend only
test-frontend.bat

# Check backend health
curl http://localhost:8000/api/health

# Check frontend
# Open: http://localhost:8081
```

---

**Ready to test! Run `test-both.bat` to start everything!** 🚀
