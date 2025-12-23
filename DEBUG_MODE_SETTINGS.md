# Debug Mode Settings

## Overview

The application now has proper debug mode controls that affect instructor verification behavior.

## Configuration

### Environment Variables (backend/.env)

```dotenv
DEBUG=False  # Set to True to enable debug mode features
AUTO_VERIFY_INSTRUCTORS=False  # Explicit control (overridden by DEBUG)
```

## Behavior

### Production Mode (DEBUG=False)

- ✅ Instructors created with `is_verified=False`
- ✅ Requires manual verification in Admin Dashboard
- ✅ Instructors appear in "Pending Verification" list
- ✅ Instructors cannot accept bookings until verified

### Debug/Development Mode (DEBUG=True)

- ⚠️ Instructors automatically verified on registration
- ⚠️ Skips manual verification workflow
- ⚠️ For testing purposes only
- ⚠️ **DO NOT use in production**

## How It Works

The system uses a property-based check:

```python
@property
def should_auto_verify_instructors(self) -> bool:
    """Auto-verify instructors only in debug mode"""
    return self.DEBUG and self.AUTO_VERIFY_INSTRUCTORS
```

This ensures:

1. Auto-verification ONLY happens when both flags are True
2. In production, even if `AUTO_VERIFY_INSTRUCTORS=True`, it won't activate unless `DEBUG=True`
3. Provides double safety against accidental production auto-verification

## Switching Modes

### To Enable Debug Mode (for testing):

```dotenv
DEBUG=True
AUTO_VERIFY_INSTRUCTORS=True  # Optional, but recommended for testing
```

### To Disable Debug Mode (for production):

```dotenv
DEBUG=False
AUTO_VERIFY_INSTRUCTORS=False
```

## Admin Dashboard Verification

When debug mode is OFF:

1. New instructors register
2. They appear in Admin Dashboard → "Instructor Verification" screen
3. Admin reviews and approves/rejects
4. Only verified instructors can accept bookings

## Console Logging

The system now logs verification actions:

```
[INFO] Instructor 123 created - requires manual verification
```

or

```
[DEBUG] Auto-verified instructor 123 (debug mode enabled)
```

## Restart Required

After changing `.env` file settings:

1. Stop backend server
2. Restart backend server
3. New settings will take effect

## Testing Verification Workflow

1. Set `DEBUG=False` in `.env`
2. Restart backend server
3. Register new instructor
4. Check Admin Dashboard → "Instructor Verification"
5. Verify/reject instructor
6. Confirm instructor appears in student instructor list after verification
