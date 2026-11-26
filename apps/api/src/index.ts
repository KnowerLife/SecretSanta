import { serve } from '@hono/node-server';
import app from './app.ts';

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API_READY http://127.0.0.1:${info.port}/api/health`);
});
