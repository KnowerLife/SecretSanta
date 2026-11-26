import { Link } from '@tanstack/react-router';
import { useI18n } from '../app/providers/i18n.tsx';
import { Scene } from '../shared/ui/Scene.tsx';

/** Витрина на GitHub Pages: комнаты живут в полноценном SSR/API-деплое. */
export function PagesRoomNotice() {
  const { t } = useI18n();
  return (
    <div className="container dashboard">
      <div className="empty-state">
        <Scene id="mode-online" />
        <h1>{t('pages.room.title')}</h1>
        <p>{t('pages.room.text')}</p>
        <Link className="btn btn--primary" to="/">
          {t('pages.room.home')}
        </Link>
      </div>
    </div>
  );
}
