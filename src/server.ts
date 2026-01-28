import app from './app.ts';
import { connectMongo } from './db/mongo.ts';
import { cleanupRateLimitStore } from './middleware/rateLimit.ts';

const port = Number(process.env.PORT || 8080);

await connectMongo().catch((e) => {
  console.error('Failed to connect to MongoDB:', e);
  process.exit(1);
});

// Cleanup rate limit store every hour
const cleanupInterval = setInterval(() => {
  cleanupRateLimitStore();
  console.log('[Rate Limit] Cleaned up old entries from rate limit store');
}, 60 * 60 * 1000);

// Cleanup on shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  clearInterval(cleanupInterval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  clearInterval(cleanupInterval);
  process.exit(0);
});

const server = Bun.serve({
  hostname: "0.0.0.0",
  port,
  fetch: app.fetch,
});

console.log(`Server listening on port ${server.port}`);

