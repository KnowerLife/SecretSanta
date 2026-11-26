import { RoomDashboard } from '../widgets/RoomDashboard.tsx';
import type { RoomBootstrap } from '../entities/room/server.ts';
import { Route } from '../routes/room.$code.tsx';

export function RoomPage() {
  const { code } = Route.useParams();
  const bootstrap = Route.useLoaderData() as RoomBootstrap;
  return <RoomDashboard code={code} bootstrap={bootstrap} />;
}
