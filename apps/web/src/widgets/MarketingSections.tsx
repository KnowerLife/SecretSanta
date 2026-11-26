import type { ReactNode } from 'react';
import { Box, Group } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import type { SceneId } from '@secret-santa/art';
import { useI18n } from '../app/providers/i18n.tsx';
import { FestiveGarland } from '../shared/ui/FestiveDecor.tsx';
import { Scene } from '../shared/ui/Scene.tsx';
import { DemoRoomButton } from '../features/guide/DemoRoomButton.tsx';
import { SiteGuide } from '../features/guide/SiteGuide.tsx';

const TRUST_ICONS = [
  <path key="lock" d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5z" />,
  <path key="chat" d="M20 12a7 7 0 0 1-7 7H8l-4 3 1.2-4.4A7 7 0 1 1 20 12Z" />,
  <path key="package" d="m12 3 9 5v8l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v8" />,
  <path key="bolt" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
] as const;

function TrustIcon({ index }: { index: number }) {
  return (
    <svg
      className="trust-pill__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRUST_ICONS[index - 1]}
    </svg>
  );
}

function Head({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div className="section__head">
      <span className="kicker">{kicker}</span>
      <h2>{title}</h2>
      <p>{sub}</p>
    </div>
  );
}

function SceneCard({
  id,
  title,
  text,
  cta,
  className = '',
}: {
  id: SceneId;
  title: string;
  text: string;
  cta?: ReactNode;
  className?: string;
}) {
  return (
    <article className={`card ${className}`.trim()}>
      <div className="card__scene">
        <Scene id={id} />
      </div>
      <div className="card__body">
        <h3>{title}</h3>
        <p>{text}</p>
        {cta && <div className="btn-row">{cta}</div>}
      </div>
    </article>
  );
}

export function HeroSection() {
  const { t } = useI18n();
  return (
    <section className="container hero">
      <Box>
        <span className="hero__eyebrow">{t('hero.eyebrow')}</span>
        <h1 dangerouslySetInnerHTML={{ __html: t('hero.title') }} />
        <p className="hero__lead">{t('hero.lead')}</p>
        <Group className="btn-row" gap={12} wrap="wrap">
          <Link className="btn btn--primary" to="/create">
            {t('hero.ctaCreate')}
          </Link>
          <Link className="btn btn--secondary" to="/join">
            {t('hero.ctaJoin')}
          </Link>
          <DemoRoomButton className="btn btn--secondary">{t('hero.ctaDemo')}</DemoRoomButton>
        </Group>
        <p className="hero__note">{t('hero.note')}</p>
        <Group className="trust-row" gap={10} wrap="wrap">
          {[1, 2, 3, 4].map((index) => (
            <span className="trust-pill" key={index}>
              <TrustIcon index={index} />
              {t(`hero.trust.${index}`)}
            </span>
          ))}
        </Group>
      </Box>
      <Box className="hero__art">
        <FestiveGarland />
        <Scene id="hero-winter-scene" />
      </Box>
    </section>
  );
}

export function ModesSection() {
  const { t } = useI18n();
  const modes = [
    { id: 'mode-online', key: 'full', to: '/create', demo: false },
    { id: 'mode-quick', key: 'quick', to: '/quick-draw', demo: false },
    { id: 'mode-demo', key: 'demo', to: null, demo: true },
  ] as const;
  return (
    <section className="section section--compact" id="modes">
      <div className="container">
        <Head kicker={t('modes.kicker')} title={t('modes.title')} sub={t('modes.sub')} />
        <div className="grid grid--3 mode-grid">
          {modes.map((mode) => (
            <SceneCard
              key={mode.key}
              className="mode-card"
              id={mode.id}
              title={t(`modes.${mode.key}.title`)}
              text={t(`modes.${mode.key}.text`)}
              cta={
                mode.demo ? (
                  <DemoRoomButton className="btn btn--secondary">
                    {t(`modes.${mode.key}.cta`)}
                  </DemoRoomButton>
                ) : (
                  <Link className="btn btn--secondary" to={mode.to}>
                    {t(`modes.${mode.key}.cta`)}
                  </Link>
                )
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function StepsSection() {
  const { t } = useI18n();
  return (
    <section className="section" id="how">
      <div className="container">
        <Head kicker={t('steps.kicker')} title={t('steps.title')} sub={t('steps.sub')} />
        <div className="grid grid--3">
          {([
            { num: 1, id: 'step-create-game' },
            { num: 2, id: 'step-invite-friends' },
            { num: 3, id: 'step-draw-gifts' },
          ] as const).map((step) => (
            <article className="card" key={step.num}>
              <div className="card__scene">
                <Scene id={step.id} />
              </div>
              <div className="card__body">
                <span className="step-num">{t(`steps.${step.num}.num`)}</span>
                <h3>{t(`steps.${step.num}.title`)}</h3>
                <p>{t(`steps.${step.num}.text`)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  const { t } = useI18n();
  const features = [
    { key: 'wishlist', id: 'wishlist-empty' },
    { key: 'chat', id: 'feature-anonymous-chat' },
    { key: 'exclusions', id: 'privacy-who-sees' },
    { key: 'status', id: 'quick-draw-success' },
  ] as const;
  return (
    <section className="section section--tint" id="features">
      <div className="container">
        <Head kicker={t('features.kicker')} title={t('features.title')} sub={t('features.sub')} />
        <div className="grid grid--4">
          {features.map((feature) => (
            <SceneCard
              key={feature.key}
              id={feature.id}
              title={t(`features.${feature.key}.title`)}
              text={t(`features.${feature.key}.text`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PrivacySection() {
  const { t } = useI18n();
  return (
    <section className="section" id="privacy">
      <div className="container grid grid--2">
        <Head kicker={t('privacy.kicker')} title={t('privacy.title')} sub={t('privacy.sub')} />
        <Scene id="privacy-who-sees" />
      </div>
      <div className="container grid grid--3 privacy-roles">
        {['organizer', 'santa', 'member'].map((role) => (
          <div className="card card__body" key={role}>
            <h3>{t(`privacy.${role}.title`)}</h3>
            <p>{t(`privacy.${role}.text`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RulesSection() {
  const { t } = useI18n();
  return (
    <section className="section section--tint">
      <div className="container grid grid--2">
        <div>
          <Head kicker={t('rules.kicker')} title={t('rules.title')} sub="" />
          <ul className="list">
            {[1, 2, 3, 4].map((index) => (
              <li key={index}>{t(`rules.${index}`)}</li>
            ))}
          </ul>
        </div>
        <Scene id="rules-fair-draw" />
      </div>
    </section>
  );
}

export function AudienceSection() {
  const { t } = useI18n();
  return (
    <section className="section">
      <div className="container">
        <Head kicker={t('audience.kicker')} title={t('audience.title')} sub={t('audience.sub')} />
        <div className="grid grid--4">
          {['friends', 'work', 'family', 'remote'].map((item) => (
            <SceneCard
              key={item}
              id={item === 'remote' ? 'audience-remote' : 'testimonials-friends'}
              title={t(`audience.${item}.title`)}
              text={t(`audience.${item}.text`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function IdeasSection() {
  const { t } = useI18n();
  return (
    <section className="section section--tint">
      <div className="container">
        <Head kicker={t('ideas.kicker')} title={t('ideas.title')} sub={t('ideas.sub')} />
        <div className="grid grid--4">
          {['cozy', 'hobby', 'care', 'sweet'].map((item) => (
            <div className="card card__body" key={item}>
              <h3>{t(`ideas.${item}.title`)}</h3>
              <p>{t(`ideas.${item}.text`)}</p>
            </div>
          ))}
        </div>
        <div className="section-art">
          <Scene id="gift-ideas" />
        </div>
      </div>
    </section>
  );
}

export function GuideSection() {
  const { t } = useI18n();
  return (
    <section className="section section--tight" id="guide">
      <div className="container">
        <Head kicker={t('guide.site.kicker')} title={t('guide.site.title')} sub={t('guide.site.sub')} />
        <SiteGuide />
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  const { t } = useI18n();
  return (
    <section className="section section--tint">
      <div className="container">
        <Head kicker={t('testimonials.kicker')} title={t('testimonials.title')} sub="" />
        <div className="grid grid--3">
          {[1, 2, 3].map((index) => (
            <div className="card card__body" key={index}>
              <p>“{t(`testimonials.${index}.text`)}”</p>
              <p className="card__author">
                {t(`testimonials.${index}.name`)} · {t(`testimonials.${index}.role`)}
              </p>
            </div>
          ))}
        </div>
        <div className="section-art">
          <Scene id="testimonials-friends" />
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  const { t } = useI18n();
  return (
    <section className="section section--compact section--narrow" id="faq">
      <div>
        <Head kicker={t('faq.kicker')} title={t('faq.title')} sub="" />
        <div className="faq-list">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <details className="faq-item" key={index}>
              <summary>{t(`faq.${index}.q`)}</summary>
              <p>{t(`faq.${index}.a`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  const { t } = useI18n();
  return (
    <section
      className="section section--compact section--narrow"
      aria-label={`${t('home.more.title')} — ${t('home.more.sub')}`}
    >
      <div className="cta-band">
        <span className="kicker">{t('cta.kicker')}</span>
        <h2>{t('cta.title')}</h2>
        <p>{t('cta.sub')}</p>
        <div className="btn-row">
          <Link className="btn btn--accent" to="/create">
            {t('hero.ctaCreate')}
          </Link>
          <Link className="btn btn--secondary" to="/join">
            {t('hero.ctaJoin')}
          </Link>
        </div>
      </div>
    </section>
  );
}
