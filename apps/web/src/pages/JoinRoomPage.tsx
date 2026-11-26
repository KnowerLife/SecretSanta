import { Scene } from '../shared/ui/Scene.tsx';
import { JoinRoomForm } from '../features/room/JoinRoomForm.tsx';

export function JoinRoomPage() {
  return (
    <div className="container form-layout">
      <div>
        <Scene id="join-game-head" />
      </div>
      <JoinRoomForm />
    </div>
  );
}
