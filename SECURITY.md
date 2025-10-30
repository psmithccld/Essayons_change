# Security Documentation

## Overview

This document outlines security best practices, configuration requirements, and operational guidelines for deploying and maintaining the Project Management Application securely.

## Table of Contents

- [Environment Variables & Secrets](#environment-variables--secrets)
- [Impersonation Token System](#impersonation-token-system)
- [Rate Limiting](#rate-limiting)
- [Session Management](#session-management)
- [Database Security](#database-security)
- [Production Deployment](#production-deployment)
- [Monitoring & Incident Response](#monitoring--incident-response)

---

## Environment Variables & Secrets

### Required Secrets

The following environment variables MUST be configured before deploying to production:

#### 1. **IMPERSONATION_SECRET** (CRITICAL)
- **Purpose**: Signs and validates Super Admin impersonation tokens
- **Format**: 256-bit (32-byte) base64url-encoded string
- **Generation**:
  ```bash
  # Using OpenSSL (recommended)
  openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
  
  # Using Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```
- **Security Requirements**:
  - Must use base64url encoding (characters: `A-Z`, `a-z`, `0-9`, `-`, `_` only)
  - Never commit to version control
  - Rotate every 90 days or immediately if compromised
  - Different value for each environment (dev, staging, prod)
  - Production: Server will fail to start without this secret
  - Development: Can bypass with `ALLOW_DEV_IMPERSONATION_SECRET=true` (NOT for production)

#### 2. **DATABASE_URL**
- **Purpose**: PostgreSQL connection string for Neon database
- **Format**: `postgresql://user:password@host/database?sslmode=require`
- **Security**: Use SSL/TLS connections in production (`sslmode=require`)

#### 3. **SESSION_SECRET**
- **Purpose**: Signs session cookies
- **Format**: Random string (minimum 32 characters)
- **Generation**: `openssl rand -base64 48`

#### 4. **OPENAI_API_KEY**
- **Purpose**: OpenAI GPT-5 API access for AI coaching
- **Format**: `sk-...`
- **Security**: Monitor usage, set spending limits in OpenAI dashboard

#### 5. **SENDGRID_API_KEY**
- **Purpose**: Email notifications via SendGrid
- **Format**: `SG....`
- **Security**: Use scoped API keys with minimum required permissions

#### 6. **STRIPE_SECRET_KEY**
- **Purpose**: Stripe payment processing
- **Format**: `sk_live_...` (production) or `sk_test_...` (development)
- **Security**: Never log or expose in error messages

### Optional Configuration

#### 7. **USE_REDIS_RATE_LIMIT** (Production Recommended)
- **Purpose**: Enable Redis-backed rate limiting for horizontal scaling
- **Default**: `false` (uses in-memory storage, single-instance only)
- **Production**: Set to `true` and configure `REDIS_URL`

#### 8. **REDIS_URL**
- **Purpose**: Redis connection string for distributed rate limiting
- **Format**: `redis://host:port` or `rediss://host:port` (TLS)
- **Default**: `redis://localhost:6379`
- **Required when**: `USE_REDIS_RATE_LIMIT=true`

---

## Impersonation Token System

### Architecture

Super Admin users can generate time-limited impersonation tokens to securely access organizations for support and auditing purposes.

### Token Structure

```
{base64url_payload}.{base64url_signature}
```

- **Payload** (JSON, base64url-encoded):
  ```json
  {
    "sessionId": "current-session-id",
    "organizationId": "target-organization-id",
    "mode": "read" | "write",
    "iat": 1234567890,  // Issued at (Unix timestamp, seconds)
    "exp": 1234568190   // Expiration (Unix timestamp, seconds)
  }
  ```
- **Signature**: SHA-256 HMAC of the base64url payload using `IMPERSONATION_SECRET`

**Encoding**: Both payload and signature use base64url (URL-safe, no padding)

### Security Properties

1. **Time-Limited**: Tokens expire after 5 minutes (`exp = iat + 300`)
2. **HMAC Integrity**: Tampering invalidates the signature (timing-safe comparison)
3. **Explicit Scopes**: Token specifies exact session, organization, and access mode
4. **No Secrets in Payload**: All data is signed but not encrypted (use HTTPS)
5. **Stateless Design**: No database dependencies for validation

**Security Limitations (Current Implementation)**:
- ⚠️ **Replay Protection**: Tokens can be reused within 5-minute window
- ⚠️ **No Revocation**: Tokens cannot be invalidated before expiry
- ⚠️ **No Audit Trail**: Token usage not persisted to database

### Token Lifecycle

**Current Implementation: Stateless Validation**

The impersonation token system uses cryptographic validation only (no database persistence).

1. **Token Generation**
   - Token created with payload: `{sessionId, organizationId, mode, iat, exp}`
   - Expiration set to `iat + 300` seconds (5 minutes)
   - HMAC signature generated using `IMPERSONATION_SECRET`
   - Token format: `{base64url_payload}.{base64url_signature}`
   - **Not stored in database** - tokens are stateless bearers

2. **Token Validation**
   - Server validates on each request:
     - Token format (base64url.base64url)
     - HMAC signature using timing-safe comparison
     - Token age (current time < `exp` field)
     - Required payload fields present and valid types
   - **No database lookup** - validation is purely cryptographic
   - Expired tokens automatically fail validation

3. **Token Usage & Replay Protection**
   - ⚠️ **Current Implementation**: Tokens can be used multiple times within 5-minute window
   - ⚠️ **No database tracking**: Token usage is not persisted
   - ⚠️ **Future Enhancement**: Implement token nonce tracking in database for single-use enforcement
   - Mitigation: Short 5-minute expiry limits replay window

4. **Session Management (If Implemented)**
   - ⚠️ **Note**: Token validation utilities exist but session binding must be implemented in routes
   - Example usage: After validating token, application code can set session organization context
   - Session persistence would use existing session store (20-minute idle timeout)
   - **Current Status**: Utilities ready, integration required per application needs

### Best Practices

- **Never log tokens**: Tokens are sensitive credentials
- **Rotate IMPERSONATION_SECRET**: Change every 90 days
  - **Important**: All tokens become invalid after secret rotation
  - Plan rotation during maintenance windows
- **Monitor usage** (Requires Custom Implementation):
  - Track API endpoint access for routes calling `generateImpersonationToken()` or `validateImpersonationToken()`
  - Monitor application logs for token validation failures (logged as warnings)
  - Set up alerts for repeated validation failures (potential attack)
- **Limit token lifetime**: Current 5-minute expiry balances usability and security
  - Consider shorter lifetimes (2-3 minutes) for higher-security environments
- **Use HTTPS only**: Tokens are not encrypted, rely on TLS for confidentiality
- **Future Enhancements**:
  - Implement database nonce tracking for single-use enforcement
  - Add audit trail for token generation and usage
  - Build revocation mechanism for emergency token invalidation

---

## Rate Limiting

### Overview

The application implements multi-tier rate limiting to prevent abuse:

1. **General API Rate Limiting**: 100 requests per 15 minutes per IP
2. **Login Attempt Limiting**: 5 failed attempts per 15 minutes per username
3. **Suspicious IP Blocking**: Automatic blocking after repeated violations

### Architecture Options

#### In-Memory (Default)
- **Mode**: Single-instance deployment
- **Storage**: Node.js Map with automatic cleanup
- **Limitations**: Does not scale horizontally
- **Configuration**: No additional setup required

#### Redis-Backed (Production)
- **Mode**: Multi-instance / Kubernetes deployments
- **Storage**: Redis with automatic expiration
- **Benefits**: Shared state across all instances
- **Configuration**:
  ```bash
  USE_REDIS_RATE_LIMIT=true
  REDIS_URL=rediss://your-redis-host:6380
  ```

### Rate Limit Configuration

| Limit Type | Threshold | Window | Action |
|-----------|----------|--------|--------|
| General API | 100 req | 15 min | 429 Too Many Requests |
| Login Attempts | 5 attempts | 15 min | 429 + Lock account |
| Suspicious IP | 3 violations | 24 hours | Report + Block |

### Cleanup & Maintenance

- **In-Memory**: Automatic cleanup every 15 minutes
- **Redis**: TTL-based automatic expiration
- **Store Size Limits**: 100,000 entries per store (evicts oldest)

### Monitoring

Monitor rate limit store growth for capacity planning:

```javascript
// Example metric emission (implement in production)
if (totalEntries > 80000) {
  metrics.emit('rate_limit_store_high_watermark', { store: 'rate-limit', size: totalEntries });
}
```

---

## Session Management

### Configuration

- **Store**: PostgreSQL-backed session store (`connect-pg-simple`)
- **Cookie Settings**:
  - `httpOnly: true` - Prevents XSS cookie theft
  - `secure: true` - HTTPS-only in production
  - `sameSite: 'lax'` - CSRF protection
  - `maxAge: 24 hours` - Session lifetime

### Idle Timeout

- **Client-Side**: Automatic logout after 20 minutes of inactivity
- **Server-Side**: Sessions persist up to 24 hours
- **Implementation**: Browser event listeners track user activity

### Best Practices

- **Regenerate Session ID**: After login and privilege escalation
- **Clear Sessions**: On logout and password change
- **Monitor Active Sessions**: Track concurrent sessions per user

---

## Database Security

### Multi-Tenant Isolation

All database queries enforce organization-level isolation:

```typescript
// Example: Organization-scoped query
const projects = await db.select()
  .from(projectsTable)
  .innerJoin(organizationMemberships, 
    eq(projectsTable.organizationId, organizationMemberships.organizationId))
  .where(eq(organizationMemberships.userId, userId));
```

### Security Layers

1. **Organization Context Required**: Most routes require `requireOrgContext` middleware
2. **Membership Validation**: Verify user belongs to organization before data access
3. **Role-Based Access Control**: Permissions checked per organization
4. **SQL Injection Prevention**: Drizzle ORM with parameterized queries

### Database Migrations

- **Never write manual SQL migrations**
- Use `npm run db:push` to sync schema changes
- Use `npm run db:push --force` if data-loss warnings appear
- **CRITICAL**: Never change primary key ID types (serial ↔ varchar)

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All required secrets configured (IMPERSONATION_SECRET, DATABASE_URL, etc.)
- [ ] `USE_REDIS_RATE_LIMIT=true` with valid REDIS_URL
- [ ] SSL/TLS certificates for HTTPS
- [ ] Session secret rotated from development
- [ ] Database backup strategy in place
- [ ] Monitoring and logging configured
- [ ] Node.js version >= 20.0.0 (base64url support required)

### Environment-Specific Settings

#### Development
```bash
NODE_ENV=development
ALLOW_DEV_IMPERSONATION_SECRET=true  # Optional: bypasses IMPERSONATION_SECRET requirement
USE_REDIS_RATE_LIMIT=false  # In-memory rate limiting
```

#### Production
```bash
NODE_ENV=production
IMPERSONATION_SECRET=<base64url-secret>  # REQUIRED
USE_REDIS_RATE_LIMIT=true
REDIS_URL=rediss://production-redis:6380
SESSION_SECRET=<random-secret>
DATABASE_URL=postgresql://...?sslmode=require
```

### Scaling Considerations

#### Single Instance (Current)
- In-memory rate limiting works fine
- Session store in PostgreSQL
- No Redis required

#### Multi-Instance (Future)
- Redis-backed rate limiting mandatory
- Load balancer with sticky sessions
- Shared session store (PostgreSQL already shared)
- Metrics aggregation across instances

---

## Monitoring & Incident Response

### Key Metrics to Monitor

1. **Rate Limit Store Growth**
   - Alert when store size > 80,000 entries
   - Indicates potential DDoS or abuse

2. **Failed Login Attempts**
   - Alert on > 50 failed logins in 5 minutes
   - Indicates credential stuffing attack

3. **Impersonation Token Usage**
   - Alert on > 10 tokens generated per hour
   - Review logs for unauthorized access

4. **Database Query Performance**
   - Monitor slow queries (> 1 second)
   - Optimize indexes for organization-scoped queries

### Logging Best Practices

- **Never log sensitive data**: Passwords, tokens, API keys, session IDs
- **Redact by default**: Use structured logging with automatic redaction
- **Include request IDs**: Trace requests across microservices
- **Log security events**: Login failures, permission denials, impersonations

### Incident Response Checklist

#### Suspected Token Compromise
1. Rotate `IMPERSONATION_SECRET` immediately
2. Invalidate all active impersonation sessions
3. Review audit logs for unauthorized access
4. Notify affected organizations

#### Database Breach
1. Immediately rotate all secrets (DATABASE_URL, SESSION_SECRET, etc.)
2. Force logout all users (clear session store)
3. Review access logs for suspicious queries
4. Enable enhanced monitoring

#### DDoS / Rate Limit Abuse
1. Review rate limit store for attack patterns
2. Temporarily lower rate limits if needed
3. Block attacker IPs at firewall/CDN level
4. Scale Redis if using distributed rate limiting

---

## Security Contacts

For security vulnerabilities or incidents:
- **Internal Team**: Escalate via on-call rotation
- **External Researchers**: security@yourcompany.com

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-30 | 1.0 | Initial security documentation |

---

## References

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [Redis Security](https://redis.io/docs/management/security/)
