# ID Number Validation Implementation

## Overview

Added comprehensive validation for South African ID numbers to ensure they are exactly 13 digits for both student and instructor registration.

## Changes Made

### Backend Validation (Schema Level)

**File:** `backend/app/schemas/user.py`

Added `@field_validator` decorators to both `InstructorBase` and `StudentBase` classes:

```python
@field_validator('id_number')
@classmethod
def validate_id_number(cls, v: str) -> str:
    """Validate ID number is exactly 13 digits"""
    # Remove any whitespace
    v = v.strip()

    # Check if it's all digits
    if not v.isdigit():
        raise ValueError('ID number must contain only numbers')

    # Check length
    if len(v) < 13:
        raise ValueError(f'ID number is too short (must be 13 digits, got {len(v)})')
    elif len(v) > 13:
        raise ValueError(f'ID number is too long (must be 13 digits, got {len(v)})')

    return v
```

**Validation Rules:**

- ✅ Must be exactly 13 characters
- ✅ Must contain only numeric digits (0-9)
- ✅ Whitespace is automatically trimmed
- ❌ Letters or special characters rejected
- ❌ Too short (< 13 digits) rejected
- ❌ Too long (> 13 digits) rejected

### Custom Error Handler

**File:** `backend/app/main.py`

Added custom exception handler for `RequestValidationError` to provide user-friendly error messages:

```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler for validation errors to provide user-friendly error messages"""
    errors = exc.errors()

    if errors:
        first_error = errors[0]
        field = first_error.get('loc', [])[-1]
        msg = first_error.get('msg', 'Validation error')

        # Clean up error message
        if 'id_number' in str(field):
            error_detail = msg.replace('Value error, ', '')
        else:
            error_detail = f"{field}: {msg}"

        return JSONResponse(
            status_code=422,
            content={"detail": error_detail}
        )
```

### Frontend Enhancement

**File:** `frontend/screens/auth/RegisterInstructorScreen.tsx`

Added `maxLength={13}` to ID number input field:

```tsx
<FormFieldWithTip
  label="ID Number"
  tooltip="Your South African ID number..."
  required
  placeholder="e.g., 8001015009087"
  value={formData.id_number}
  onChangeText={(text) => updateFormData("id_number", text)}
  keyboardType="numeric"
  maxLength={13}
/>
```

**Note:** Student registration already had `maxLength={13}` configured.

## Error Messages

Users will see inline error messages (not popups) when validation fails:

### Too Short:

```
❌ Registration Failed: ID number is too short (must be 13 digits, got 12)
```

### Too Long:

```
❌ Registration Failed: ID number is too long (must be 13 digits, got 14)
```

### Contains Letters:

```
❌ Registration Failed: ID number must contain only numbers
```

## Testing

Created test files to verify functionality:

1. **Unit Tests:** `backend/test_id_validation.py`

   - Tests Pydantic schema validation directly
   - All 14 test cases passing ✅

2. **API Tests:** `backend/test_api_id_validation.py`
   - Tests validation through API endpoints
   - Verifies error responses are properly formatted

### Run Tests:

```powershell
# Unit tests (no server required)
cd C:\Projects\DRIVE_ALIVE\backend
.\venv\Scripts\python.exe test_id_validation.py

# API tests (requires running server)
.\venv\Scripts\python.exe test_api_id_validation.py
```

## User Experience Flow

1. **User enters invalid ID number** (e.g., 12 digits)
2. **User clicks "Register"**
3. **Backend validates and rejects** (HTTP 422)
4. **Frontend displays inline error** at top of form:
   ```
   ❌ Registration Failed: ID number is too short (must be 13 digits, got 12)
   ```
5. **Form auto-scrolls to top** for visibility
6. **User corrects ID number and resubmits**

## Frontend Features

- ✅ Inline error messages (no popups)
- ✅ Auto-scroll to error message
- ✅ Auto-dismiss after 4 seconds (can be dismissed manually)
- ✅ Field limits input to 13 characters (`maxLength`)
- ✅ Numeric keyboard on mobile devices
- ✅ Detailed tooltip explaining requirements

## Backend Features

- ✅ Pydantic schema validation (fail-fast)
- ✅ Custom error messages
- ✅ Whitespace trimming
- ✅ Character type validation
- ✅ Length validation with specific counts
- ✅ User-friendly error responses

## Compliance

This validation helps ensure:

- **POPIA Compliance:** Valid ID numbers for identity verification
- **Data Quality:** Only properly formatted ID numbers in database
- **User Experience:** Clear, actionable error messages

## Related Files

- `backend/app/schemas/user.py` - Validation logic
- `backend/app/main.py` - Error handler
- `frontend/screens/auth/RegisterInstructorScreen.tsx` - Instructor form
- `frontend/screens/auth/RegisterStudentScreen.tsx` - Student form
- `frontend/components/InlineMessage.tsx` - Error display component

## Notes

- Validation occurs at both frontend (maxLength) and backend (full validation)
- Frontend limitation is UX convenience; backend validation is security requirement
- Error messages are specific and include actual character count
- Whitespace is automatically trimmed so " 1234567890123 " is valid
