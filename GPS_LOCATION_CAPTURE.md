# GPS Location Capture Feature

## Overview

Students can now capture their current GPS location when booking driving lessons. This feature works on **web browsers (mobile and desktop)** using the HTML5 Geolocation API.

## Implementation Details

### Frontend Components

#### 1. **AddressAutocomplete Component** ([frontend/components/AddressAutocomplete.tsx](frontend/components/AddressAutocomplete.tsx))

**New Features:**

- ✅ "Use Current Location (GPS)" button
- ✅ High-accuracy GPS capture (`enableHighAccuracy: true`)
- ✅ Automatic reverse geocoding (OpenStreetMap Nominatim API)
- ✅ Auto-fill address fields from GPS coordinates
- ✅ Manual address entry fallback
- ✅ Error handling with user-friendly messages
- ✅ Loading states and visual feedback

**GPS Configuration:**

```typescript
{
  enableHighAccuracy: true,  // Use GPS instead of network location
  timeout: 15000,            // 15 seconds timeout
  maximumAge: 0,             // Don't use cached position
}
```

**Callback Structure:**

```typescript
onLocationCapture={(coords: { latitude: number; longitude: number }) => {
  // Coordinates captured successfully
}}
```

#### 2. **BookingScreen** ([frontend/screens/booking/BookingScreen.tsx](frontend/screens/booking/BookingScreen.tsx))

**Changes:**

- Added `pickupCoordinates` state to store GPS data
- Updated `AddressAutocomplete` to capture coordinates via callback
- Modified booking submission to include coordinates in payment data
- Default coordinates: Cape Town (-33.9249, 18.4241) if GPS not used

**Example:**

```typescript
const [pickupCoordinates, setPickupCoordinates] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);

<AddressAutocomplete
  onLocationCapture={(coords) => {
    setPickupCoordinates(coords);
    console.log('📍 Pickup location captured:', coords);
  }}
/>
```

#### 3. **PaymentScreen** ([frontend/screens/payment/PaymentScreen.tsx](frontend/screens/payment/PaymentScreen.tsx))

**Changes:**

- Updated booking data structure to include `pickup_latitude` and `pickup_longitude`
- Coordinates passed to backend during payment initiation

**Data Structure:**

```typescript
const bookingsData = bookings.map((booking) => ({
  lesson_date: `${booking.date}T${booking.time}:00`,
  duration_minutes: 60,
  pickup_address: booking.pickup_address || "",
  pickup_latitude: booking.pickup_latitude || -33.9249,
  pickup_longitude: booking.pickup_longitude || 18.4241,
  student_notes: booking.notes || null,
}));
```

### Backend Changes

#### **Payment Routes** ([backend/app/routes/payments.py](backend/app/routes/payments.py))

**Stripe Webhook (lines 275-310):**

```python
pickup_latitude = booking_data.get("pickup_latitude", -33.9249)  # Default to Cape Town
pickup_longitude = booking_data.get("pickup_longitude", 18.4241)

booking = Booking(
    ...
    pickup_latitude=pickup_latitude,
    pickup_longitude=pickup_longitude,
    ...
)
```

**Mock Payment Handler (lines 485-510):**

```python
booking = Booking(
    ...
    pickup_latitude=booking_data.get("pickup_latitude", -33.9249),
    pickup_longitude=booking_data.get("pickup_longitude", 18.4241),
    ...
)
```

### Database Schema

**Existing Model** ([backend/app/models/booking.py](backend/app/models/booking.py))

```python
# Location
pickup_latitude = Column(Float, nullable=False)
pickup_longitude = Column(Float, nullable=False)
pickup_address = Column(String, nullable=False)

dropoff_latitude = Column(Float, nullable=True)
dropoff_longitude = Column(Float, nullable=True)
dropoff_address = Column(String, nullable=True)
```

**Schema Validation** ([backend/app/schemas/booking.py](backend/app/schemas/booking.py))

```python
pickup_latitude: float = Field(..., ge=-90, le=90)
pickup_longitude: float = Field(..., ge=-180, le=180)
pickup_address: str
```

## Browser Compatibility

### ✅ Supported Platforms

- **Web Browsers (Mobile):**
  - ✅ Chrome (Android/iOS)
  - ✅ Safari (iOS)
  - ✅ Firefox (Android)
  - ✅ Edge (Android)

- **Web Browsers (Desktop):**
  - ✅ Chrome
  - ✅ Firefox
  - ✅ Edge
  - ✅ Safari

- **Progressive Web Apps (PWAs):** ✅ Full support

### ⚠️ Requirements

- **HTTPS Required:** Geolocation API only works on secure connections
- **User Permission:** Browser prompts for location access (one-time)
- **Location Services:** Must be enabled on device

## User Experience Flow

1. **Student clicks "Use Current Location (GPS)"**
   - Button shows loading spinner

2. **Browser prompts for permission** (first time only)
   - User grants or denies access

3. **GPS captures coordinates**
   - High-accuracy mode activated
   - 15-second timeout

4. **Reverse geocoding (automatic)**
   - OpenStreetMap Nominatim API called
   - Address fields auto-filled
   - Success message displayed with coordinates

5. **Fallback to manual entry**
   - If GPS fails, user can type address manually
   - Clear error messages guide the user

## Error Handling

### Permission Denied

```
"Location permission denied. Please enable in browser settings."
```

**Solution:** User must enable location in browser settings

### Position Unavailable

```
"Location unavailable. Please try again."
```

**Solution:** GPS signal weak, try moving to open area

### Timeout

```
"Location request timed out. Please try again."
```

**Solution:** Device taking too long, retry or use manual entry

### GPS Not Available

```
"GPS not available on this device"
```

**Solution:** Browser doesn't support Geolocation API (rare)

## Default Coordinates

When GPS is not used, the system defaults to:

- **Latitude:** -33.9249 (Cape Town, South Africa)
- **Longitude:** 18.4241

This ensures all bookings have valid coordinates even without GPS.

## Reverse Geocoding

**Provider:** OpenStreetMap Nominatim (Free, no API key required)

**Endpoint:**

```
https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1
```

**Mapped Fields:**

- **Street Address:** `address.road` or `address.street` + `address.house_number`
- **Suburb:** `address.suburb` or `address.neighbourhood`
- **City:** `address.city` or `address.town`
- **Postal Code:** `address.postcode`

**Rate Limits:** 1 request/second (sufficient for our use case)

## Privacy & Security

### Data Collection

- GPS coordinates captured only when user clicks button
- Coordinates stored in database with booking
- No continuous tracking
- User consent required via browser prompt

### HTTPS Requirement

- Geolocation API requires secure connection
- Already enforced by browser
- No additional configuration needed

### POPIA Compliance

- User explicitly requests GPS capture
- Data used only for lesson pickup
- No third-party sharing (except OpenStreetMap for reverse geocoding)
- Stored securely in database

## Testing

### Web Browser (Mobile)

1. Open app in mobile browser (Chrome/Safari)
2. Navigate to booking screen
3. Click "Use Current Location (GPS)"
4. Allow location permission
5. Verify coordinates captured
6. Verify address auto-filled
7. Complete booking

### Verification

- Check console logs for coordinates
- Verify booking in database includes lat/lng
- Test with permission denied scenario
- Test with airplane mode (should fail gracefully)

## Future Enhancements

### Planned Features

- [ ] Show pickup location on map (Google Maps/Leaflet)
- [ ] Distance calculation between student and instructor
- [ ] Route planning for instructors
- [ ] Geofencing for lesson start/end
- [ ] Historical location tracking (with consent)

### Potential Integrations

- [ ] Google Maps API (requires paid plan)
- [ ] Mapbox (better pricing than Google)
- [ ] Driver navigation integration

## Troubleshooting

### GPS Not Working on Mobile Web

1. **Check HTTPS:** Ensure app is served over HTTPS
2. **Check Permissions:** Settings → Site Settings → Location
3. **Location Services:** Enable GPS in device settings
4. **Browser Compatibility:** Use Chrome or Safari

### Coordinates Not Saved

1. **Check Console:** Look for error messages
2. **Verify Callback:** Ensure `onLocationCapture` is called
3. **Check State:** Verify `pickupCoordinates` state updated
4. **Backend Logs:** Check if coordinates passed to payment API

### Reverse Geocoding Failed

- GPS coordinates still captured
- User can manually enter address
- No impact on booking functionality
- Check OpenStreetMap API status

## API References

### JavaScript Geolocation API

- **MDN Documentation:** https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- **Browser Support:** https://caniuse.com/geolocation

### OpenStreetMap Nominatim

- **API Docs:** https://nominatim.org/release-docs/latest/api/Reverse/
- **Usage Policy:** https://operations.osmfoundation.org/policies/nominatim/
- **Rate Limits:** 1 request/second

## Support

For issues or questions:

1. Check browser console for errors
2. Verify HTTPS connection
3. Test in different browser
4. Review error messages in UI
5. Contact development team

---

**Status:** ✅ Implemented (January 25, 2026)
**Platforms:** Web (Mobile & Desktop)
**Backend Support:** Fully integrated
**Database:** Coordinates stored in `bookings` table
