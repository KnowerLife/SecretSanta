import { Link } from '@tanstack/react-router';
import { useI18n } from '../app/providers/i18n.tsx';
import { usePwaInstall } from './SiteHeader.tsx';
import './pwa-install.css';

export function SiteFooter() {
  const { t } = useI18n();
  const install = usePwaInstall();

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
        <div className="footer-install">
          <strong>{t('footer.installTitle')}</strong>
          <p className="install-hint">{t('footer.installText')} {t(install.hintKey)}</p>
          {install.canInstall && (
            <button className="btn btn--secondary" type="button" onClick={() => void install.promptInstall()}>
              {t('footer.install')}
            </button>
          )}
        </div>
        <div>{t('footer.copy')} · {t('footer.made')}</div>
      </div>
    </footer>
  );
}
