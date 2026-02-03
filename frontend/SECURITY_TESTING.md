# Security Testing Guide
# Database Interface Security Validation

## OWASP ZAP Automated Security Scan

Run automated security testing with OWASP ZAP to identify vulnerabilities.

### Installation

```bash
# Download OWASP ZAP
https://www.zaproxy.org/download/

# Or use Docker
docker pull zaproxy/zap-stable
```

### Running Security Scans

```bash
# Full scan
zap-cli quick-scan http://localhost:8081/database-interface

# Spider scan
zap-cli spider http://localhost:8081

# Active scan
zap-cli active-scan http://localhost:8081/database-interface

# Generate HTML report
zap-cli report -o security-report.html -f html
```

## Security Checklist

### Authentication & Authorization

- [x] **Admin-only access**: Only admins can access Database Interface
- [x] **JWT token validation**: All API requests require valid JWT
- [x] **Token expiration**: Tokens expire after configured time
- [x] **Role-based access control (RBAC)**: Enforced at backend
- [ ] **Session timeout**: Test inactivity logout (30 min)
- [ ] **CSRF protection**: Verify CSRF tokens on state-changing requests

### Input Validation

- [ ] **SQL Injection**: Test with malicious input (`' OR '1'='1`)
- [ ] **XSS (Cross-Site Scripting)**: Test with `<script>alert('XSS')</script>`
- [ ] **NoSQL Injection**: Test with MongoDB operators (`{"$gt": ""}`)
- [ ] **Path Traversal**: Test with `../../../etc/passwd`
- [ ] **Command Injection**: Test with `; rm -rf /`

### API Security

- [x] **HTTPS enforcement**: All traffic over HTTPS in production
- [x] **CORS policy**: Strict origin validation
- [x] **Rate limiting**: Prevent brute force attacks
- [x] **ETag validation**: Prevent lost update attacks
- [ ] **Content-Type validation**: Reject invalid content types
- [ ] **Request size limits**: Prevent DoS with large payloads

### Data Security

- [x] **Password hashing**: BCrypt with salt
- [x] **Sensitive data masking**: Passwords never exposed in API
- [ ] **PII encryption**: Personal data encrypted at rest
- [ ] **Audit logging**: All CRUD operations logged
- [ ] **Data retention**: Old records purged after retention period

### Error Handling

- [x] **RFC 7807 error format**: Consistent error responses
- [x] **No stack traces**: Production errors don't leak implementation details
- [ ] **Rate limit errors**: 429 Too Many Requests
- [ ] **Generic error messages**: Don't reveal sensitive info

## Security Test Cases

### 1. Authentication Bypass

```javascript
// Test: Access Database Interface without JWT token
fetch('http://localhost:8000/api/database/users', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // No Authorization header
  },
})
  .then(response => {
    console.log('Status:', response.status);
    // Expected: 401 Unauthorized
  });
```

### 2. SQL Injection

```javascript
// Test: SQL injection in search parameter
const maliciousSearch = "'; DROP TABLE users; --";

fetch(`http://localhost:8000/api/database/users?search=${encodeURIComponent(maliciousSearch)}`, {
  headers: {
    'Authorization': 'Bearer <valid-token>',
  },
})
  .then(response => response.json())
  .then(data => {
    // Expected: No SQL injection, safe query handling
    console.log('Data:', data);
  });
```

### 3. XSS Attack

```javascript
// Test: XSS in user input fields
const xssPayload = {
  first_name: "<script>alert('XSS')</script>",
  last_name: "<img src=x onerror=alert('XSS')>",
  email: "test@example.com",
};

fetch('http://localhost:8000/api/database/users/1', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer <valid-token>',
    'Content-Type': 'application/json',
    'If-Match': '<etag>',
  },
  body: JSON.stringify(xssPayload),
})
  .then(response => response.json())
  .then(data => {
    // Expected: Input sanitized, no script execution
    console.log('Data:', data);
  });
```

### 4. IDOR (Insecure Direct Object Reference)

```javascript
// Test: Access other user's data
const userId = 999; // User ID not owned by current admin

fetch(`http://localhost:8000/api/database/users/${userId}`, {
  headers: {
    'Authorization': 'Bearer <student-token>', // Not admin
  },
})
  .then(response => {
    console.log('Status:', response.status);
    // Expected: 403 Forbidden (students can't access database interface)
  });
```

### 5. Mass Assignment

```javascript
// Test: Attempt to modify protected fields
const maliciousPayload = {
  first_name: "John",
  role: "ADMIN", // Try to escalate to admin
  is_superuser: true, // Try to gain superuser access
};

fetch('http://localhost:8000/api/database/users/1', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer <valid-token>',
    'Content-Type': 'application/json',
    'If-Match': '<etag>',
  },
  body: JSON.stringify(maliciousPayload),
})
  .then(response => response.json())
  .then(data => {
    // Expected: Only whitelisted fields updated
    console.log('Role:', data.role); // Should NOT be ADMIN
  });
```

### 6. ETag Bypass

```javascript
// Test: Update without ETag (concurrent edit protection)
fetch('http://localhost:8000/api/database/users/1', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer <valid-token>',
    'Content-Type': 'application/json',
    // No If-Match header
  },
  body: JSON.stringify({ first_name: "Updated" }),
})
  .then(response => {
    console.log('Status:', response.status);
    // Expected: 428 Precondition Required (ETag required)
  });
```

### 7. Bulk Operation Limit Bypass

```javascript
// Test: Attempt to update >100 records
const largePayload = {
  user_ids: Array.from({ length: 150 }, (_, i) => i + 1),
  update_data: { status: "SUSPENDED" },
};

fetch('http://localhost:8000/api/database/bulk-update', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <valid-token>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(largePayload),
})
  .then(response => response.json())
  .then(data => {
    // Expected: 400 Bad Request (limit 100 records)
    console.log('Error:', data.detail);
  });
```

## Vulnerability Scanning

### Dependencies

```bash
# Run npm audit to check for vulnerable dependencies
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Review audit report
npm audit --json > audit-report.json
```

### Static Code Analysis

```bash
# Install ESLint security plugin
npm install --save-dev eslint-plugin-security

# Run security linting
npx eslint . --ext .ts,.tsx --config .eslintrc.security.js
```

## Penetration Testing

Manual penetration testing scenarios:

1. **Session Hijacking**: Steal JWT token via XSS or network interception
2. **Brute Force**: Attempt to brute force admin login
3. **Privilege Escalation**: Student tries to access admin endpoints
4. **Data Exfiltration**: Extract sensitive user data via API
5. **DoS Attack**: Flood API with requests

## Results Tracking

| Vulnerability | Risk Level | Status | Mitigation |
|---------------|-----------|--------|------------|
| SQL Injection | Critical | ✅ PASS | Parameterized queries (SQLAlchemy ORM) |
| XSS | High | ⏳ TEST | Input sanitization needed |
| CSRF | Medium | ⏳ TEST | CSRF tokens needed |
| IDOR | High | ✅ PASS | Admin-only access enforced |
| Mass Assignment | Medium | ⏳ TEST | Field whitelisting needed |
| Broken Auth | Critical | ✅ PASS | JWT + role-based access |
| Sensitive Data | High | ⏳ TEST | Encryption at rest needed |
| XXE | Medium | N/A | No XML parsing |
| SSRF | Medium | N/A | No external requests |
| Unvalidated Redirects | Low | ⏳ TEST | Validate redirect URLs |

## Security Headers

Verify the following HTTP security headers are set:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: no-referrer
```

Test with: https://securityheaders.com/

## Compliance

- **POPIA (South Africa)**: Personal data protection compliance
- **GDPR (if applicable)**: Right to erasure, data portability
- **OWASP Top 10 (2021)**: Address all top 10 vulnerabilities

Run all security tests before production deployment.
