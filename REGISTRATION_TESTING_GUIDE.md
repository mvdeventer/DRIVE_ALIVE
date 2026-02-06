# Registration Flow Testing Guide

## Servers Status ✅
- **Backend**: http://localhost:8000 (running PID: 26656)
- **Frontend**: http://localhost:8081 (running PID: 11428)  
- **Edge Dev Tools**: Open (Press F12 if closed)

---

## Manual Testing Steps in Edge Browser

### Step 1: Open Frontend in Edge Tab
Navigate to: **http://localhost:8081**

### Step 2: Open Edge Dev Tools
- Press **F12** to open Developer Tools
- Go to **Network** tab to monitor requests
- Go to **Console** tab to check for errors

---

## Test Flow 1: Student Registration

### In Browser:
1. Click "Register as Student" button
2. Fill out the form with test data:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `student1@test.com`
   - **Phone**: `0611154598` (or `0821234567`)
     - **Observe**: Phone field should auto-update to `+27611154598`
   - ID Number: `9001015001088`
   - Learner's Permit: `LP123456`
   - Emergency Contact Name: `Jane Doe`
   - **Emergency Phone**: `0821234567`
     - **Observe**: Should auto-update to `+27821234567`
   - Address: `123 Main Street`
   - Postal Code: `8000`
   - Password: `TestPassword123!`
   - Confirm Password: `TestPassword123!`

3. Click "Review Registration" button

### In Dev Tools Network Tab:
- Look for POST request to `/auth/register/student`
- **Check Request Body**:
  - `"phone": "+27611154598"` (should be formatted)
  - `"emergency_contact_phone": "+27821234567"` (should be formatted)
- **Check Response**:
  - Status should be 200 or 201 (Success)
  - Response contains user ID, email, etc.

### Expected Result:
- ✅ User receives confirmation message
- ✅ Navigates to verification screen
- ✅ Shows "Check your email and WhatsApp for verification link"

---

## Test Flow 2: Instructor Registration

### In Browser:
1. Go back to Login screen
2. Click "Register as Instructor"
3. Fill out the form:
   - First Name: `Jane`
   - Last Name: `Smith`
   - Email: `instructor1@test.com`
   - **Phone**: `0611154598`
     - **Observe**: Auto-updates to `+27611154598`
   - ID Number: `8512015001055`
   - License Number: `ABC123DEF456`
   - License Types: Select `B`, `EB`
   - Vehicle Make: `Toyota`
   - Vehicle Model: `Corolla`
   - Vehicle Year: `2020`
   - Vehicle Color: `White`
   - Vehicle Registration: `ABC123GP`
   - Hourly Rate: `350.00`
   - Rate per KM: `7.50`
   - Service Radius: `25`
   - Rate Beyond Radius: `10.00`
   - Experience: `5`
   - Bio: `Professional driving instructor`
   - Address: `456 Oak Avenue`
   - Postal Code: `8001`
   - Password: `TestPassword123!`

4. Click "Review Registration"
5. Confirm details in modal

### In Dev Tools Network Tab:
- Look for POST request to `/auth/register/instructor`
- **Check Request Body**:
  - `"phone": "+27611154598"` (formatted)
  - All license types included
  - Vehicle details present
  - Rates correct
- **Check Response**: Status 200/201

### Expected Result:
- ✅ Success message
- ✅ Navigates to Schedule Setup screen (for instructors to set availability)
- ✅ Or navigates to verification pending screen

---

## Test Flow 3: Check Phone Formatting in Frontend

### In Browser Console (F12):
1. Go to Registration screen
2. Open Console tab
3. Enter phone number: `06111545498`
4. Observe: Field auto-updates to `+276111545498`

### Accepted Formats:
- ✅ `0611154598` → `+27611154598`
- ✅ `06111545498` → `+276111545498`
- ✅ `27611154598` → `+27611154598`
- ✅ `+27611154598` → `+27611154598` (no change)

---

## Test Flow 4: CORS Preflight Check

### In Dev Tools Network Tab:
1. Start network recording
2. Submit any registration form
3. Look for **OPTIONS** request before the POST request
4. **Expected**:
   - Method: `OPTIONS`
   - Status: `200 OK`
   - Headers include `Access-Control-Allow-Origin`

---

## Test Flow 5: Error Handling

### Test Invalid Data:
1. Try registering with existing email (use email from previous test)
2. **Expected**: Error message "Email already registered"

### Test Missing Fields:
1. Try submitting with empty required fields
2. **Expected**: Inline error messages appear

### Test Password Mismatch:
1. Enter different passwords in password fields
2. **Expected**: Confirmation modal blocked or error shown

---

## Dev Tools Monitoring Checklist

### Network Tab:
- [ ] No 422 validation errors
- [ ] No 400 bad request errors
- [ ] Phone numbers formatted in requests
- [ ] OPTIONS preflight requests succeed
- [ ] Response headers include CORS headers

### Console Tab:
- [ ] No JavaScript errors (red errors)
- [ ] No fetch/network errors
- [ ] No warning messages about unsupported APIs

### Application Tab:
- [ ] Check localStorage for stored tokens after login
- [ ] Verify `access_token` and `user_role` are saved

---

## Troubleshooting

### If 422 Error:
- Check Network tab Request Body
- Verify all required fields are present
- Check phone format (should be +27...)

### If CORS Error:
- Should not occur - we added OPTIONS handlers
- If it happens, restart backend: `Stop-Process -Id 26656`

### If Phone Not Formatting:
- Check browser console for JavaScript errors
- Verify `phoneFormatter.ts` is imported correctly
- Try refreshing the page: `Ctrl+Shift+R`

### If Verification Not Sent:
- Email may not be configured
- WhatsApp may not have credentials
- Check backend logs for SMTP/Twilio errors

---

## Next Steps After Successful Registration

1. **Verify Account**: Check email for verification link
2. **Log In**: Try logging in with created credentials
3. **Complete Profile**: Edit profile information
4. **Instructor Schedule**: If instructor, set weekly availability
5. **Make Booking**: If student, book a lesson with an instructor

---

## API Quick Reference

### Student Registration Endpoint
```
POST /auth/register/student
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "Password123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+27611154598",
  "id_number": "9001015001088",
  ...
}
```

### Instructor Registration Endpoint
```
POST /auth/register/instructor
Content-Type: application/json

{
  "email": "instructor@example.com",
  "password": "Password123!",
  "phone": "+27611154598",
  "license_types": ["B", "EB"],
  ...
}
```

---

## Notes
- Phone formatting happens automatically in frontend before sending to backend
- Backend also has validation to ensure phone is in correct format
- No special API testing needed - Edge Dev Tools will show all network activity
- All validation errors appear inline in the form
