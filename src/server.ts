import app from './app.ts';
import { connectMongo } from './db/mongo.ts';

const port = Number(process.env.PORT || 8080);

await connectMongo().catch((e) => {
  console.error('Failed to connect to MongoDB:', e);
  process.exit(1);
});

const server = Bun.serve({
  hostname: "0.0.0.0",
  port,
  fetch: app.fetch,
});

console.log(`Server listening on port ${server.port}`);

