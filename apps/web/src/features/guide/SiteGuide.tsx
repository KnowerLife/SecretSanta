import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from '@tanstack/react-router';
import type { SceneId } from '@secret-santa/art';
import { useI18n } from '../../app/providers/i18n.tsx';
import { tokenKey } from '../../shared/api/client.ts';
import { Scene } from '../../shared/ui/Scene.tsx';
import { DemoRoomButton } from './DemoRoomButton.tsx';
import './site-guide.css';

const STEPS = [1, 2, 3, 4, 5] as const;
const STEP_SCENES: Record<(typeof STEPS)[number], SceneId> = {
  1: 'guide-format',
  2: 'guide-prep',
  3: 'guide-room-team',
  4: 'guide-room-wishes',
  5: 'guide-room-draw',
};
const PANEL_ID = 'site-guide-detail';
const TOKEN_PREFIX = tokenKey('');

/** Finds a room the visitor already has a session for, without exposing its token. */
function storedRoomCode(): string | null {
  if (typeof window === 'undefined') return null;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(TOKEN_PREFIX) && window.localStorage.getItem(key)) {
      return key.slice(TOKEN_PREFIX.length);
    }
  }
  return null;
}

export function SiteGuide() {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setRoomCode(storedRoomCode());
  }, []);

  const step = STEPS[active]!;

  const onStepKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % STEPS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + STEPS.length) % STEPS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = STEPS.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="site-guide">
      <div className="site-guide__rail" role="tablist" aria-label={t('guide.railAria')}>
        {STEPS.map((item, index) => (
          <button
            key={item}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            id={`site-guide-tab-${item}`}
            className="site-guide__step"
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls={PANEL_ID}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onStepKeyDown(event, index)}
          >
            <span className="site-guide__step-num" aria-hidden="true">
              {item}
            </span>
            <span>{t(`guide.site.${item}.title`)}</span>
          </button>
        ))}
      </div>

      <div
        className="site-guide__panel"
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={`site-guide-tab-${step}`}
        tabIndex={0}
      >
        <div className="site-guide__copy">
          <span className="site-guide__progress" aria-live="polite">
            {active + 1} / {STEPS.length}
          </span>
          <h3>{t(`guide.site.${step}.title`)}</h3>
          <p>{t(`guide.site.${step}.text`)}</p>
          <p className="site-guide__tip">{t(`guide.site.${step}.tip`)}</p>
          <div className="btn-row">
            {step === 1 && (
              <>
                <Link className="btn btn--primary" to="/create">
                  {t('nav.create')}
                </Link>
                <Link className="btn btn--secondary" to="/quick-draw">
                  {t('nav.quick')}
                </Link>
                <DemoRoomButton className="btn btn--secondary">{t('hero.ctaDemo')}</DemoRoomButton>
              </>
            )}
            {step === 2 && (
              <Link className="btn btn--primary" to="/create">
                {t('nav.create')}
              </Link>
            )}
            {step === 3 && (
              <Link className="btn btn--primary" to="/join">
                {t('nav.join')}
              </Link>
            )}
            {step === 4 &&
              (roomCode ? (
                <Link className="btn btn--primary" to="/room/$code" params={{ code: roomCode }}>
                  {t('nav.dashboard')}
                </Link>
              ) : (
                <Link className="btn btn--primary" to="/create">
                  {t('nav.create')}
                </Link>
              ))}
            {step === 5 && (
              <>
                <Link className="btn btn--primary" to="/quick-draw">
                  {t('nav.quick')}
                </Link>
                <DemoRoomButton className="btn btn--secondary">{t('hero.ctaDemo')}</DemoRoomButton>
              </>
            )}
          </div>
        </div>
        <div className="site-guide__art" aria-hidden="true">
          <Scene id={STEP_SCENES[step]} />
        </div>
      </div>
    </div>
  );
}
