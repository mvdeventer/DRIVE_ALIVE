# Reusable Components

Shared UI components used throughout the application.

## Available Components

### FormFieldWithTip

Standard form input field with an info tooltip.

**Props:**

- `label`: Field label
- `tooltip`: Help text shown in modal
- `required`: Shows asterisk if true
- All standard TextInput props

### LicenseTypeSelector

Multi-select component for South African driving license types (A1, A, B, C1, C, EB, EC1, EC).

**Props:**

- `label`: Component label
- `tooltip`: Help text
- `required`: Shows asterisk if true
- `selectedTypes`: Array of selected license codes
- `onSelectionChange`: Callback with updated selection

### LocationSelector

Hierarchical location picker for South African provinces, cities, and suburbs with search functionality.

**Props:**

- `label`: Component label (default: "Location")
- `tooltip`: Help text (optional)
- `required`: Shows asterisk if true
- `selectedProvince`: Currently selected province
- `selectedCity`: Currently selected city
- `selectedSuburb`: Currently selected suburb
- `onProvinceChange`: Callback when province changes
- `onCityChange`: Callback when city changes
- `onSuburbChange`: Callback when suburb changes
- `showSuburbs`: Enable suburb selection (default: false)

**Features:**

- Hierarchical selection: Province → City → Suburb
- Smart search across all levels
- Breadcrumb navigation
- Tab-based interface
- Postal code display for suburbs
- Filtered results as you type

**Example Usage:**

```tsx
<LocationSelector
  label="Operating Location"
  tooltip="Select your primary operating area"
  required
  selectedProvince={formData.province}
  selectedCity={formData.city}
  selectedSuburb={formData.suburb}
  onProvinceChange={province => setFormData({ ...formData, province })}
  onCityChange={city => setFormData({ ...formData, city })}
  onSuburbChange={suburb => setFormData({ ...formData, suburb })}
  showSuburbs={true}
/>
```
