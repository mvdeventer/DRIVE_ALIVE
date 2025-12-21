# Location System Update Guide

## What Changed

### ✅ Frontend (Already Done)

- **cities.ts** - Complete SA location database (provinces, cities, suburbs)
- **LocationSelector** component - Searchable hierarchical dropdown
- Static reference data (no database needed for provinces/cities/suburbs)

### 🔄 Backend (Updated - Migration Needed)

#### Database Schema Changes:

**Instructors table:**

- Added `province` (nullable) - Operating province
- Added `suburb` (nullable) - Operating suburb
- Existing `city` field retained

**Students table:**

- Added `suburb` (nullable) - Residential suburb
- Existing `province` and `city` fields retained

## How to Apply Database Changes

### Option 1: Run Migration (Recommended for existing data)

```bash
cd backend
python migrations/add_location_fields.py
```

This will:

- Add `province` and `suburb` columns to both tables
- Keep all existing data intact
- Set new columns as nullable (won't break existing records)

### Option 2: Fresh Database (Easy for development)

```bash
# Stop the backend server
# Delete the database file
cd backend
del drive_alive.db  # Windows
# rm drive_alive.db  # Linux/Mac

# Restart the server - it will recreate with new schema
python -m uvicorn app.main:app --reload
```

## Using the New Fields

### Frontend - Registration Forms

**Instructor Registration:**

```tsx
import LocationSelector from "../components/LocationSelector";

const [province, setProvince] = useState("");
const [city, setCity] = useState("");
const [suburb, setSuburb] = useState("");

<LocationSelector
  label="Operating Location"
  tooltip="Select where you primarily operate"
  required
  selectedProvince={province}
  selectedCity={city}
  selectedSuburb={suburb}
  onProvinceChange={setProvince}
  onCityChange={setCity}
  onSuburbChange={setSuburb}
  showSuburbs={true}
/>;
```

**Student Registration:**

```tsx
<LocationSelector
  label="Residential Address"
  tooltip="Select your residential area"
  required
  selectedProvince={formData.province}
  selectedCity={formData.city}
  selectedSuburb={formData.suburb}
  onProvinceChange={(p) => setFormData({ ...formData, province: p })}
  onCityChange={(c) => setFormData({ ...formData, city: c })}
  onSuburbChange={(s) => setFormData({ ...formData, suburb: s })}
  showSuburbs={true}
/>
```

### Backend - API Payload

Registration requests now support:

```json
{
  "province": "Gauteng",
  "city": "Johannesburg",
  "suburb": "Sandton"
}
```

All three fields are stored in the database and returned in API responses.

## Benefits

1. **Better Matching** - Match students with nearby instructors by province/suburb
2. **Improved Search** - Filter instructors by province, city, or suburb
3. **Better UX** - Users select from valid SA locations (no typos)
4. **Analytics** - Track service areas and demand by region
5. **Scalability** - Easy to add features like "instructors in my suburb"

## Migration Status

- [ ] Run database migration
- [ ] Update instructor registration form
- [ ] Update student registration form
- [ ] Test registration flow
- [ ] Update instructor search/filter
- [ ] Update booking logic for location matching
