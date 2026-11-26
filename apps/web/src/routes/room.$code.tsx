import { createFileRoute } from '@tanstack/react-router';
import { loadRoomBootstrap } from '../entities/room/server.ts';
import { PagesRoomNotice } from '../pages/PagesRoomNotice.tsx';
import { RoomPage } from '../pages/RoomPage.tsx';
import { PAGES_MODE } from '../shared/base.ts';

export const Route = createFileRoute('/room/$code')({
  loader: PAGES_MODE
    ? () => undefined
    : ({ params }) => loadRoomBootstrap({ data: { code: params.code } }),
  component: PAGES_MODE ? PagesRoomNotice : RoomPage,
  pendingComponent: () => <div className="container dashboard">Loading…</div>,
});
