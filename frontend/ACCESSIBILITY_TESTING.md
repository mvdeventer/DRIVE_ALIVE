# Accessibility Testing Guide
# Database Interface A11y Validation

## Axe Core Automated Testing

Install and run automated accessibility audits with Axe Core.

### Installation

```bash
npm install --save-dev @axe-core/react axe-core
```

### Integration

```typescript
// frontend/App.tsx
import React from 'react';

if (process.env.NODE_ENV !== 'production') {
  const axe = require('@axe-core/react');
  axe(React, 1000); // Run axe checks every 1000ms in development
}
```

### Running Tests

```bash
# Run in development mode
npm run start

# Open browser console to see axe-core violations
# Violations will be logged automatically
```

## Accessibility Checklist

### Keyboard Navigation

- [ ] **Tab navigation**: All interactive elements accessible via Tab key
- [ ] **Enter/Space activation**: Buttons and links work with Enter/Space
- [ ] **Escape key**: Closes modals and dropdowns
- [ ] **Arrow keys**: Navigate through table rows and dropdowns
- [ ] **Focus visible**: Clear focus indicator on all elements
- [ ] **Focus trap**: Modals trap focus (can't tab out)
- [ ] **Skip links**: "Skip to content" link for screen readers

### Screen Reader Support

- [ ] **ARIA labels**: All interactive elements have proper labels
- [ ] **ARIA roles**: Semantic roles for custom components
- [ ] **ARIA live regions**: Dynamic content updates announced
- [ ] **Alt text**: Images have descriptive alt attributes
- [ ] **Table headers**: Data tables have proper th elements
- [ ] **Form labels**: All inputs have associated labels
- [ ] **Error announcements**: Errors read by screen readers

### Visual Accessibility

- [ ] **Color contrast**: WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] **Text sizing**: Minimum 16px, resizable to 200%
- [ ] **Focus indicators**: Visible 2px outline
- [ ] **Touch targets**: Minimum 44x44px for mobile
- [ ] **Color not sole indicator**: Don't rely on color alone

### Testing with Screen Readers

#### NVDA (Windows - Free)

```
Download: https://www.nvaccess.org/download/

Common commands:
- NVDA + Down Arrow: Read next item
- NVDA + Up Arrow: Read previous item
- NVDA + T: Read page title
- NVDA + F7: Elements list
- Insert + F7: Links list
```

#### JAWS (Windows - Paid)

```
Download: https://www.freedomscientific.com/products/software/jaws/

Common commands:
- Down Arrow: Next line
- Up Arrow: Previous line
- H: Next heading
- T: Next table
- F: Next form field
```

## Manual Accessibility Tests

### 1. Keyboard-Only Navigation

Test all functionality without using a mouse:

```
Steps:
1. Open Database Interface
2. Press Tab to navigate through UI
3. Use Enter/Space to activate buttons
4. Use Escape to close modals
5. Use Arrow keys to navigate tables
6. Verify all features accessible via keyboard
```

### 2. Screen Reader Testing

```
Steps:
1. Enable NVDA or JAWS
2. Navigate to Database Interface
3. Tab through all elements
4. Verify all labels read correctly
5. Verify table data is accessible
6. Verify modals announce properly
7. Verify error messages are read aloud
```

### 3. Color Contrast Testing

```
Tool: WebAIM Contrast Checker
URL: https://webaim.org/resources/contrastchecker/

Steps:
1. Screenshot Database Interface
2. Use color picker to get foreground/background colors
3. Check contrast ratio
4. Verify ≥ 4.5:1 for normal text
5. Verify ≥ 3:1 for large text (18pt+)
```

### 4. Text Resize Testing

```
Steps:
1. Open Database Interface in browser
2. Press Ctrl + Plus (+) to zoom to 200%
3. Verify all text is readable
4. Verify no horizontal scrolling
5. Verify no content overlap
```

### 5. Focus Indicator Testing

```
Steps:
1. Tab through all interactive elements
2. Verify visible focus ring on each element
3. Verify focus ring is at least 2px thick
4. Verify focus ring has sufficient contrast
```

## Automated Testing with Jest + Axe

```typescript
// frontend/screens/__tests__/DatabaseInterfaceScreen.a11y.test.tsx

import React from 'react';
import { render } from '@testing-library/react-native';
import { toHaveNoViolations } from 'jest-axe';
import DatabaseInterfaceScreen from '../../screens/admin/DatabaseInterfaceScreen';

expect.extend(toHaveNoViolations);

describe('DatabaseInterfaceScreen Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<DatabaseInterfaceScreen />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## ARIA Attributes to Verify

### Tables

```jsx
<table role="table" aria-label="User List">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">Name</th>
      <th role="columnheader">Email</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row">
      <td role="cell">John Doe</td>
      <td role="cell">john@example.com</td>
    </tr>
  </tbody>
</table>
```

### Modals

```jsx
<Modal
  visible={isVisible}
  transparent
  aria-modal="true"
  role="dialog"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <Text id="modal-title">Edit User</Text>
  <Text id="modal-description">Update user information</Text>
  {/* ... */}
</Modal>
```

### Buttons

```jsx
<TouchableOpacity
  role="button"
  aria-label="Delete user John Doe"
  accessibilityRole="button"
  accessibilityLabel="Delete user John Doe"
  onPress={handleDelete}
>
  <Text>Delete</Text>
</TouchableOpacity>
```

### Form Inputs

```jsx
<View>
  <Text id="first-name-label">First Name</Text>
  <TextInput
    aria-labelledby="first-name-label"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? 'first-name-error' : undefined}
  />
  {hasError && (
    <Text id="first-name-error" role="alert">
      First name is required
    </Text>
  )}
</View>
```

### Loading States

```jsx
<View
  role="status"
  aria-live="polite"
  aria-busy="true"
  aria-label="Loading users..."
>
  <ActivityIndicator />
  <Text>Loading...</Text>
</View>
```

## Results Tracking

| Criteria | Standard | Status | Issues |
|----------|----------|--------|--------|
| Keyboard Navigation | WCAG 2.1.1 | ⏳ TEST | - |
| Focus Visible | WCAG 2.4.7 | ⏳ TEST | - |
| Color Contrast | WCAG 1.4.3 (AA) | ⏳ TEST | - |
| Text Resize | WCAG 1.4.4 | ⏳ TEST | - |
| ARIA Labels | WCAG 4.1.2 | ⏳ TEST | - |
| Screen Reader Support | WCAG 4.1.3 | ⏳ TEST | - |
| Touch Targets | WCAG 2.5.5 | ⏳ TEST | - |
| Error Identification | WCAG 3.3.1 | ⏳ TEST | - |
| Form Labels | WCAG 3.3.2 | ⏳ TEST | - |
| Modals | WCAG 2.4.3 | ⏳ TEST | - |

## WCAG Compliance Level

Target: **WCAG 2.1 Level AA**

- **Level A**: Minimum accessibility (25 criteria)
- **Level AA**: Recommended for most websites (38 criteria)
- **Level AAA**: Enhanced accessibility (61 criteria)

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [React Native Accessibility API](https://reactnative.dev/docs/accessibility)

Run all accessibility tests before production deployment.
