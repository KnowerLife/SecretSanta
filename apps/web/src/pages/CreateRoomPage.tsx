import { Scene } from '../shared/ui/Scene.tsx';
import { CreateRoomForm } from '../features/room/CreateRoomForm.tsx';

export function CreateRoomPage() {
  return (
    <div className="container form-layout">
      <div>
        <Scene id="create-game-head" />
      </div>
      <CreateRoomForm />
    </div>
  );
}
