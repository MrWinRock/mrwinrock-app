import app from './app.ts';
import { connectMongo } from './db/mongo.ts';

const port = Number(process.env.PORT || 5000);

await connectMongo().catch((e) => {
  console.error('Failed to connect to MongoDB:', e);
  process.exit(1);
});

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Server listening at http://localhost:${server.port}`);

