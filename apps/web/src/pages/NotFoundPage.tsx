import { Link } from '@tanstack/react-router';
import { useI18n } from '../app/providers/i18n.tsx';
import { Scene } from '../shared/ui/Scene.tsx';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="container dashboard">
      <div className="empty-state">
        <Scene id="faq-help" />
        <h1>404 · {t('notFound.title')}</h1>
        <p>{t('notFound.text')}</p>
        <Link className="btn btn--primary" to="/">
          {t('notFound.home')}
        </Link>
      </div>
    </div>
  );
}
