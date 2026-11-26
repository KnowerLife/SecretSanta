import { useI18n } from '../app/providers/i18n.tsx';
import {
  AudienceSection,
  CtaSection,
  FaqSection,
  FeaturesSection,
  GuideSection,
  HeroSection,
  IdeasSection,
  ModesSection,
  PrivacySection,
  RulesSection,
  TestimonialsSection,
} from '../widgets/MarketingSections.tsx';

export function HomePage() {
  const { t } = useI18n();

  return (
    <>
      <HeroSection />
      <GuideSection />
      <ModesSection />
      <section className="container section section--compact">
        <details className="card info-disclosure" id="homeInfo">
          <summary>
            <span className="info-disclosure__icon" aria-hidden="true">✦</span>
            <span className="info-disclosure__copy">
              <strong>{t('home.more.title')}</strong>
              <small>{t('home.more.sub')}</small>
            </span>
          </summary>
          <div className="info-disclosure__body">
            <FeaturesSection />
            <PrivacySection />
            <RulesSection />
            <AudienceSection />
            <IdeasSection />
            <TestimonialsSection />
          </div>
        </details>
      </section>
      <FaqSection />
      <CtaSection />
    </>
  );
}
