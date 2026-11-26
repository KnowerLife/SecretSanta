import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { drawAssignments } from '@secret-santa/shared/draw';
import type { DrawPair } from '@secret-santa/shared/draw';
import { quickResultMetaKey } from '@secret-santa/shared/i18n';
import { useI18n } from '../../app/providers/i18n.tsx';
import { Scene } from '../../shared/ui/Scene.tsx';
import './quick-draw.css';

export {
  buildPairsCsv,
  decodePair,
  encodePair,
  hasDuplicateNames,
  personalUrl,
} from './pairs.ts';
import type { PersonalPair } from './pairs.ts';
import { buildPairsCsv, decodePair, hasDuplicateNames, personalUrl } from './pairs.ts';

export function QuickDrawTool() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { searchStr } = useLocation();
  const [namesText, setNamesText] = useState('Анна\nБорис\nВика\nГлеб');
  const [pairs, setPairs] = useState<DrawPair[]>([]);
  const [error, setError] = useState('');
  const [personal, setPersonal] = useState<PersonalPair | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const encoded = new URLSearchParams(searchStr).get('gift');
    setPersonal(encoded ? decodePair(encoded) : null);
  }, [searchStr]);

  const meta = useMemo(() => {
    if (pairs.length === 0) return '';
    const key =
      locale === 'en' && quickResultMetaKey(pairs.length) === 'quick.resultMetaFew'
        ? 'quick.resultMetaMany'
        : quickResultMetaKey(pairs.length);
    return t(key, { n: pairs.length });
  }, [pairs.length, t, locale]);

  const draw = () => {
    setError('');
    setNotice('');
    const names = namesText
      .split('\n')
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length < 3) {
      setError(t('quick.errMin'));
      return;
    }
    if (hasDuplicateNames(names)) {
      setError(t('quick.errDup'));
      return;
    }
    const result = drawAssignments(names);
    if (!result) {
      setError(t('quick.errFail'));
      return;
    }
    setPairs(result);
  };

  const reset = () => {
    setPairs([]);
    setNamesText('');
    setError('');
    setNotice('');
    if (personal) void navigate({ to: '/quick-draw' });
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(t(key));
    } catch {
      setNotice(text);
    }
  };

  const csv = () => {
    const blob = new Blob([buildPairsCsv(pairs)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'secret-santa-pairs.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(t('quick.csvDone'));
  };

  if (personal) {
    return (
      <div className="quick-draw">
        <section className="panel" data-quick-personal>
          <h2>{t('quick.personalKicker')}</h2>
          <p className="panel__sub">{t('quick.personalNote')}</p>
          <p className="quick-draw__hello" data-quick-personal-hello>
            {t('quick.personalHello', { name: personal.santa })}
          </p>
          <p>
            {t('quick.personalLabel')} <strong data-quick-personal-recipient>{personal.recipient}</strong>
          </p>
          <p className="field-hint">{t('quick.personalWarning')}</p>
          {notice && (
            <p className="notice" data-kind="success" role="status">
              {notice}
            </p>
          )}
          <div className="btn-row">
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => void copy(personalUrl(personal), 'quick.linkCopied')}
            >
              {t('quick.personalCopy')}
            </button>
            <button className="btn btn--secondary" type="button" onClick={reset}>
              {t('quick.reset')}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid grid--2 quick-draw">
      <section className="panel">
        <h2>{t('quick.namesLabel')}</h2>
        <p className="panel__sub">{t('quick.sub')}</p>
        <div className="field">
          <label htmlFor="quick-names" className="sr-only">
            {t('quick.namesLabel')}
          </label>
          <textarea
            id="quick-names"
            value={namesText}
            onChange={(event) => setNamesText(event.target.value)}
            placeholder={t('quick.namesPh')}
          />
          <p className="field-hint">{t('quick.namesHint')}</p>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" data-kind="success" role="status">
            {notice}
          </p>
        )}
        <div className="btn-row">
          <button className="btn btn--primary" type="button" onClick={draw}>
            {t('quick.draw')}
          </button>
          <button className="btn btn--secondary" type="button" onClick={reset}>
            {t('quick.reset')}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>{t('quick.resultTitle')}</h2>
        <p className="panel__sub">{meta || t('quick.resultEmpty')}</p>
        {pairs.length === 0 ? (
          <div className="empty-state">
            <Scene id="quick-draw-success" />
            <p>{t('quick.resultEmptyTitle')}</p>
          </div>
        ) : (
          <>
            <table className="result-table">
              <thead>
                <tr>
                  <th>{t('quick.personalLabel')}</th>
                  <th>{t('dash.recipientTitle')}</th>
                  <th>
                    <span className="sr-only">{t('v69.quick.personal')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((pair, index) => (
                  <tr
                    key={`${pair.santa}-${pair.recipient}`}
                    aria-label={t('quick.pair', { santa: pair.santa, recipient: pair.recipient })}
                  >
                    <td>{pair.santa}</td>
                    <td>{pair.recipient}</td>
                    <td>
                      <button
                        className="btn btn--secondary quick-draw__link"
                        type="button"
                        data-quick-link={index}
                        title={t('v69.quick.personal')}
                        aria-label={`${t('v69.quick.personal')}: ${pair.santa}`}
                        onClick={() => void copy(personalUrl(pair), 'quick.linkCopied')}
                      >
                        {t('quick.link')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="btn-row">
              <button
                className="btn btn--secondary"
                type="button"
                onClick={() =>
                  void copy(
                    pairs.map((pair) => `${pair.santa} → ${pair.recipient}`).join('\n'),
                    'quick.copied',
                  )
                }
              >
                {t('quick.copy')}
              </button>
              <button className="btn btn--secondary" type="button" onClick={csv}>
                {t('quick.csv')}
              </button>
              <button className="btn btn--secondary" type="button" onClick={() => window.print()}>
                {t('quick.print')}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
