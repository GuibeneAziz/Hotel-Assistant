# Security — Tunisia Hotel Assistant

## 1. Security Overview

The application implements security measures aligned with OWASP (Open Web Application Security Project) guidelines. There are 7 distinct security mechanisms:

| # | Mechanism | Protects against | Where |
|---|---|---|---|
| 1 | Rate limiting | API abuse, brute force | All endpoints |
| 2 | Input validation (Zod) | Malformed data, injection | All POST endpoints |
| 3 | XSS protection (DOMPurify) | Cross-site scripting | Chat, settings inputs |
| 4 | JWT authentication | Unauthorized admin access | Admin routes |
| 5 | Password hashing (bcrypt) | Credential theft | Admin login |
| 6 | Route protection (middleware) | Unauthorized page access | Dashboard pages |
| 7 | Error sanitization | Information leakage | All API error handlers |

---

## 2. Rate Limiting (`lib/rate-limiter.ts`)

### Algorithm: Sliding Window

Each IP address is tracked in a `Map<string, timestamps[]>`. When a request arrives:
1. Expired timestamps (older than the window) are removed
2. The current timestamp count is checked against the limit
3. If within limit: add timestamp, allow request
4. If over limit: return HTTP 429 with `Retry-After` header

### Limits

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/chat` | 100 requests | 15 minutes |
| `POST /api/admin/login` | 5 attempts | 15 minutes |
| `GET/POST` general API | 50 requests | 15 minutes |
| Admin/analytics endpoints | 30 requests | 15 minutes |

### Implementation details

- **In-process** (no Redis required) — stored in Node.js memory per process
- **Cleanup timer**: Runs every 5 minutes to remove stale entries (prevents memory leak)
- **Client IP extraction**: Checks `X-Forwarded-For` header first (for guests behind proxies), falls back to `X-Real-IP`

```typescript
// Extract real IP (respects proxy headers)
const forwarded = headers.get('x-forwarded-for')
if (forwarded) return forwarded.split(',')[0].trim()
return headers.get('x-real-ip') ?? 'unknown'
```

### On limit exceeded

```json
HTTP 429 Too Many Requests
{ "success": false, "error": "Too many requests. Please try again later." }
```

---

## 3. Input Validation — Zod (`lib/validation.ts`)

Every incoming POST request body is validated against a Zod schema before any processing begins.

### Chat message schema

```typescript
z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message too long (max 1000 characters)'),
  hotelData: z.any().optional(),
  weather: z.any().optional(),
  sessionId: z.string().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
})
```

If validation fails → HTTP 400 Bad Request with specific error messages.

### Hotel settings schema

All hotel settings fields are also validated with Zod:
- Time values must match regex `^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$` (HH:MM)
- Start time must be before end time for restaurant meals
- Phone numbers must match `^\+?[\d\s-()]+$`
- Email must be a valid email format
- Event dates must match `^\d{4}-\d{2}-\d{2}$` (YYYY-MM-DD)

---

## 4. XSS Protection — DOMPurify (`lib/validation.ts`)

Cross-Site Scripting (XSS) attacks inject malicious HTML or JavaScript. The `validateAndSanitize()` function runs all string fields through DOMPurify before they reach Zod validation:

```typescript
export function sanitizeHtml(input: string): string {
  // Strips ALL HTML tags — returns plain text only
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
}
```

This is applied **recursively** to every string field in the request body, including nested arrays and objects.

**Example**:
- Input: `"What time <script>alert('xss')</script> is breakfast?"`
- After sanitization: `"What time  is breakfast?"`

The `isomorphic-dompurify` package is used because DOMPurify normally requires a browser DOM. This package works in Node.js server environments.

---

## 5. Admin Authentication — JWT (`app/api/admin/`)

### Login flow

```
1. Admin submits username + password to POST /api/admin/login
2. Rate limiter: max 5 attempts per 15 minutes per IP
3. Compare submitted password against stored bcrypt hash
4. If match:
   - Generate JWT: jwt.sign({ role: 'admin', hotel: 'all' }, JWT_SECRET, { expiresIn: '24h' })
   - Set httpOnly cookie: admin_token=<jwt>
   - Return HTTP 200
5. If no match:
   - Return HTTP 401 (same generic error message regardless of which field was wrong)
```

### JWT verification

Every admin API route calls `verifyAdmin()`:

```typescript
// From the cookie
const token = cookies.get('admin_token')
const payload = jwt.verify(token, process.env.JWT_SECRET)
if (payload.role !== 'admin') throw new Error('Unauthorized')
```

### Cookie security

The `admin_token` cookie is set with:
- `httpOnly: true` — JavaScript cannot access it (prevents XSS cookie theft)
- `secure: true` in production — only sent over HTTPS
- `sameSite: strict` — not sent with cross-site requests (CSRF protection)

---

## 6. Password Hashing — bcrypt (`lib/password.ts`)

Admin passwords are **never stored in plain text**. The password is hashed with bcrypt (cost factor 12) and only the hash is stored in the environment variable `ADMIN_PASSWORD_HASH`.

### Generating a password hash

```bash
node scripts/hash-password.js
# Enter password when prompted
# Outputs: $2b$12$... (the hash to put in .env.local)
```

### Verification

```typescript
const isValid = await bcrypt.compare(submittedPassword, process.env.ADMIN_PASSWORD_HASH)
```

bcrypt's `compare` is timing-safe (constant-time) — it does not leak information about partial matches.

**Why bcrypt cost factor 12?** At factor 12, a single hash takes ~250ms to compute. This means an attacker trying to brute-force the password can only try ~4 passwords per second — making dictionary attacks impractical.

---

## 7. Route Protection — Next.js Middleware (`middleware.ts`)

The `middleware.ts` file intercepts all requests to admin routes before they reach any page or API handler.

### Protected routes

```
/dashboard         → requires valid admin_token cookie
/dashboard/*       → same
/api/admin/*       → same
```

### What the middleware does

1. Extract `admin_token` cookie from the request
2. Verify the JWT: `jwt.verify(token, JWT_SECRET)`
3. If valid → let the request through
4. If invalid/missing → redirect to `/admin/login` (for pages) or return HTTP 401 (for API routes)

This means even if a developer forgets to add auth checks to a new admin page or API route, the middleware catches it.

---

## 8. Error Sanitization

In production, API error responses never expose internal details:

```typescript
const isProduction = process.env.NODE_ENV === 'production'
const errorMessage = isProduction
  ? 'An error occurred processing your request'   // generic message
  : error.message                                 // actual error (dev only)
```

This prevents:
- Database error messages from leaking table names or query structure
- File path information from leaking server directory structure
- Stack traces from being visible to users

---

## 9. Parameterized SQL Queries

All database queries use parameterized statements with the `pg` library:

```typescript
// Safe — parameter is never interpreted as SQL
await client.query(
  'SELECT * FROM guest_profiles WHERE session_id = $1',
  [sessionId]  // the value is passed separately, never concatenated
)
```

This prevents SQL injection attacks. String concatenation into SQL queries is never used anywhere in the codebase.

---

## 10. Summary Table

| Attack type | Protection mechanism |
|---|---|
| Brute force login | Rate limit: 5 attempts / 15 min + bcrypt hash |
| XSS in chat messages | DOMPurify sanitization on all string inputs |
| XSS in stored data | DOMPurify on all settings inputs before saving |
| SQL injection | Parameterized queries everywhere (`pg` library) |
| Unauthorized admin access | JWT + middleware on all `/dashboard` routes |
| Session hijacking (cookie theft) | `httpOnly`, `secure`, `sameSite=strict` cookies |
| API abuse / DoS | Rate limiting on all endpoints |
| Information leakage via errors | Generic error messages in production |
| CSRF | `sameSite=strict` cookie + JWT verification |
