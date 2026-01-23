# Address Autocomplete - OpenStreetMap Data Explanation

## Why "40 Potgieter Crescent" Shows Multiple Locations

### The Issue

When searching for "40 Potgieter Crescent," you may see results in different suburbs:

- **Morgenster Hoogte, Kraaifontein**
- **Morgenster, Brackenfell** (expected)

### Root Cause: OpenStreetMap Data Quality

OpenStreetMap (OSM) is **crowd-sourced data**, meaning:

1. **Data Completeness Varies**
   - Some areas have better mapping than others
   - Residential addresses may not all be fully geocoded
   - Street names can exist in multiple suburbs

2. **Address Ambiguity**
   - Multiple streets with same/similar names exist in Cape Town
   - OSM may have incomplete house number data for some areas
   - One location may be better mapped than another

3. **Geographic Proximity**
   - Morgenster (Brackenfell) and Morgenster Hoogte (Kraaifontein) are close
   - "Potgieter Crescent" may exist in both suburbs
   - OSM returns the best-matched result, not necessarily the one you want

## Solutions Implemented

### 1. Increased Result Limit

Changed from 5 to **10 results** so you can see more options and find the correct location.

### 2. Better Result Sorting

Results now prioritize:

- Addresses with house numbers
- Exact matches over partial matches

### 3. Cape Town Bounding Box

When you type suburb names (Brackenfell, Kraaifontein, Cape Town), the search:

- Limits results to Cape Town area (viewbox: 18.3,-34.0 to 18.9,-33.7)
- Improves relevance of local results

### 4. Enhanced Display Format

Now shows:

- **Main Line**: House number + Street name (e.g., "40 Potgieter Crescent")
- **Secondary Line**: Suburb + City (e.g., "Brackenfell, Cape Town")

This makes it easier to distinguish between locations with similar street names.

## How to Get the Right Address

### Option 1: Add Suburb Name

Instead of typing:

```
40 Potgieter Crescent
```

Type:

```
40 Potgieter Crescent Brackenfell
```

This helps OSM find the correct location.

### Option 2: Review All Results

With 10 results shown, scroll through and find the one with your correct suburb.

### Option 3: Select and Edit

1. Select any close result
2. Manually edit the address to correct suburb/area if needed

## Why Not Use Google Maps API?

Google Maps would give perfect results, BUT:

- **Costs $0.017 per request** (R0.30 ZAR)
- With 1000 searches/day = **R9,000/month**
- Requires credit card and billing account
- Has strict usage limits

OpenStreetMap is:

- ✅ **100% FREE** (no API key, no billing)
- ✅ **No usage limits** (fair use policy)
- ✅ **Good enough** for South African addresses
- ❌ Data quality varies by location

## Future Improvements

If budget allows:

1. **Google Places API** - Best accuracy, costs money
2. **HERE Maps** - Good free tier (1,000 requests/day)
3. **LocationIQ** - OSM-based with better data (10,000 free/day)
4. **South African Address Database** - SAPO/StatsSA official data

For now, **OpenStreetMap is the best free option** for a South African driving school app.

## User Workflow

When students book lessons:

1. Start typing address
2. Review autocomplete suggestions (now up to 10)
3. Look at **suburb name** in secondary line
4. Select correct location based on suburb
5. Address is saved for pickup/dropoff

The system works well enough for:

- Getting GPS coordinates
- Instructors knowing where to pick up students
- WhatsApp notifications with full addresses
