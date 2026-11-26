import { createFileRoute } from '@tanstack/react-router';
import { loadRoomBootstrap } from '../entities/room/server.ts';
import { RoomPage } from '../pages/RoomPage.tsx';

export const Route = createFileRoute('/room/$code')({
  loader: ({ params }) => loadRoomBootstrap({ data: { code: params.code } }),
  component: RoomPage,
  pendingComponent: () => <div className="container dashboard">Loading…</div>,
});
