import { Link } from '@tanstack/react-router';
import { Scene } from '../shared/ui/Scene.tsx';

export function NotFoundPage() {
  return (
    <div className="container dashboard">
      <div className="empty-state">
        <Scene id="faq-help" />
        <h1>404</h1>
        <p>Страница не найдена — вернитесь на главную и создайте новую игру.</p>
        <Link className="btn btn--primary" to="/">
          На главную
        </Link>
      </div>
    </div>
  );
}
