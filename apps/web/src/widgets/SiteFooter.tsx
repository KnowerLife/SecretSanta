import { Link } from '@tanstack/react-router';
import { useI18n } from '../app/providers/i18n.tsx';

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <strong>Тайный Санта</strong>
          <p>{t('footer.tagline')}</p>
        </div>
        <div>
          <strong>{t('footer.sections')}</strong>
          <p>
            <Link to="/create">{t('nav.create')}</Link> ·{' '}
            <Link to="/quick-draw">{t('nav.quick')}</Link> ·{' '}
            <Link to="/join">{t('nav.join')}</Link>
          </p>
        </div>
        <div>{t('footer.made')}</div>
      </div>
    </footer>
  );
}
