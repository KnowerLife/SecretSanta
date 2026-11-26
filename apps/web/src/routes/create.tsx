import { createFileRoute } from '@tanstack/react-router';
import { CreateRoomPage } from '../pages/CreateRoomPage.tsx';

export const Route = createFileRoute('/create')({
  component: CreateRoomPage,
});
