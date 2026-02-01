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

const server = Bun.serve({
  hostname: "0.0.0.0",
  port,
  fetch: app.fetch,
});

console.log(`Server listening on port ${server.port}`);

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n[${signal}] Shutting down gracefully...`);

  // Stop accepting new connections
  server.stop();
  console.log('[Shutdown] Server stopped accepting connections');

  // Clear the cleanup interval
  clearInterval(cleanupInterval);

  // Run final rate limit cleanup
  cleanupRateLimitStore();
  console.log('[Shutdown] Rate limit store cleaned up');

  // Disconnect from MongoDB
  const { disconnectMongo } = await import('./db/mongo.ts');
  await disconnectMongo();
  console.log('[Shutdown] MongoDB disconnected');

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
