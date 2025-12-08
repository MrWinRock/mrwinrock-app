# API Rate Limiting

This API implements comprehensive rate limiting to ensure fair usage and protect against abuse.

## Rate Limits

The following rate limits are applied to all `/api/*` endpoints:

- **RPS (Requests Per Second)**: 5 requests/second
- **RPM (Requests Per Minute)**: 50 requests/minute  
- **Daily Quota**: 5,000 requests/day

## Rate Limit Headers

All API responses include the following headers to help you track your usage:

- `X-RateLimit-Limit`: The maximum number of requests you can make in the current period
- `X-RateLimit-Remaining`: The number of requests remaining in the current period
- `X-RateLimit-Reset`: Unix timestamp indicating when the rate limit will reset

## Rate Limit Exceeded Response

When you exceed a rate limit, you'll receive a `429 Too Many Requests` response:

```json
{
  "ok": false,
  "status": "Too Many Requests",
  "message": "Rate limit exceeded: per second"
}
```

The response also includes a `Retry-After` header indicating how many seconds to wait before making another request.

## Example Response Headers

**Successful Request:**

```txt
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1764781702
```

**Rate Limited Request:**

```txt
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1764695303
Retry-After: 1
```

## Implementation Details

- Rate limits are tracked per client IP address (from `x-forwarded-for` or `x-real-ip` headers)
- Limits are enforced in-memory for optimal performance
- Old rate limit records are automatically cleaned up every hour
- The most restrictive limit is enforced first (second → minute → day)

## Customization

The rate limits can be customized by modifying the middleware configuration in `src/app.ts`:

```typescript
app.use('/api/*', rateLimit({
  rps: 5,      // requests per second
  rpm: 50,     // requests per minute
  daily: 5000  // requests per day
}));
```
