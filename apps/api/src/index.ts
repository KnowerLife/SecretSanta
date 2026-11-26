import { serve } from '@hono/node-server';
import app from './app.ts';
import { assertProductionSecret } from './config.ts';
import { setEventBroker } from './events.ts';
import { createEventBroker } from './redis-events.ts';

assertProductionSecret();
const broker = await createEventBroker();
setEventBroker(broker);

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API_READY http://127.0.0.1:${info.port}/api/health`);
});
