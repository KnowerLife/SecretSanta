import { createFileRoute } from '@tanstack/react-router';
import { JoinRoomPage } from '../pages/JoinRoomPage.tsx';

export const Route = createFileRoute('/join')({
  component: JoinRoomPage,
});
