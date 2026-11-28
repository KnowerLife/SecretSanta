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
        <div className="footer-brand">
          <Link className="footer-brand__link" to="/" aria-label={t('brand.aria')}>
            <span className="footer-brand__mark" aria-hidden="true">❄</span>
            <span dangerouslySetInnerHTML={{ __html: t('brand.name') }} />
          </Link>
          <p className="footer-brand__tagline">{t('footer.tagline')}</p>
        </div>

        <nav className="footer-nav" aria-label={t('footer.sections')}>
          <strong className="footer-title">{t('footer.sections')}</strong>
          <ul>
            <li><Link to="/create">{t('nav.create')}</Link></li>
            <li><Link to="/quick-draw">{t('nav.quick')}</Link></li>
            <li><Link to="/join">{t('nav.join')}</Link></li>
          </ul>
        </nav>

        <section className="footer-install" aria-label={t('footer.installTitle')}>
          <strong className="footer-title">{t('footer.installTitle')}</strong>
          {!install.installed && <p className="install-hint">{t('footer.installText')}</p>}
          <p className="install-hint install-hint--status" role="status">
            {t(install.hintKey)}
          </p>
          {install.canInstall && (
            <button
              className="btn btn--secondary"
              type="button"
              onClick={() => void install.promptInstall()}
            >
              {t('footer.install')}
            </button>
          )}
        </section>

        <div className="footer-bottom">
          <ul className="footer-bottom__list">
            <li>
              <a
                className="footer-bottom__link"
                href="https://github.com/KnowerLife/SecretSanta"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('footer.copy')}
                <span className="sr-only">{t('footer.copyContext')}</span>
              </a>
            </li>
            <li>{t('footer.made')}</li>
            <li>
              <a
                className="footer-bottom__link"
                href="https://github.com/KnowerLife"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
                <span className="sr-only">{t('footer.githubContext')}</span>
              </a>
            </li>
            <li>
              <a className="footer-bottom__link" href="#top">{t('footer.toTop')}</a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
