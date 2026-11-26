import { useEffect, useMemo, useState } from 'react';
import { drawAssignments } from '@secret-santa/shared/draw';
import type { DrawPair } from '@secret-santa/shared/draw';
import { quickResultMetaKey } from '@secret-santa/shared/i18n';
import { useI18n } from '../../app/providers/i18n.tsx';
import { Scene } from '../../shared/ui/Scene.tsx';

function encodePair(pair: { santa: string; recipient: string }): string {
  const bytes = new TextEncoder().encode(JSON.stringify(pair));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decodePair(value: string): { santa: string; recipient: string } | null {
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
      santa?: unknown;
      recipient?: unknown;
    };
    if (typeof parsed.santa !== 'string' || typeof parsed.recipient !== 'string') return null;
    return { santa: parsed.santa, recipient: parsed.recipient };
  } catch {
    return null;
  }
}

export function QuickDrawTool() {
  const { t, locale } = useI18n();
  const [namesText, setNamesText] = useState('Анна\nБорис\nВика\nГлеб');
  const [pairs, setPairs] = useState<DrawPair[]>([]);
  const [error, setError] = useState('');
  const [personal, setPersonal] = useState<{ santa: string; recipient: string } | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get('p');
    if (encoded) setPersonal(decodePair(encoded));
  }, []);

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
    if (new Set(names).size !== names.length) {
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

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setNotice(t(key));
  };

  const csv = () => {
    const text = ['Santa,Recipient', ...pairs.map((pair) => `"${pair.santa}","${pair.recipient}"`)].join('\n');
    const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'secret-santa-pairs.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(t('quick.csvDone'));
  };

  const personalLink = personal
    ? `${window.location.origin}/quick-draw?p=${encodePair(personal)}`
    : '';

  return (
    <div className="grid grid--2">
      <section className="panel">
        <h2>{t('quick.namesLabel')}</h2>
        <p className="panel__sub">{t('quick.sub')}</p>
        <div className="field">
          <label htmlFor="quick-names" className="sr-only">{t('quick.namesLabel')}</label>
          <textarea
            id="quick-names"
            value={namesText}
            onChange={(event) => setNamesText(event.target.value)}
            placeholder={t('quick.namesPh')}
          />
          <p className="field-hint">{t('quick.namesHint')}</p>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="notice" data-kind="success">{notice}</p>}
        <div className="btn-row">
          <button className="btn btn--primary" type="button" onClick={draw}>
            {t('quick.draw')}
          </button>
          <button
            className="btn btn--secondary"
            type="button"
            onClick={() => {
              setPairs([]);
              setNamesText('');
              setError('');
            }}
          >
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
                </tr>
              </thead>
              <tbody>
                {pairs.map((pair) => (
                  <tr key={pair.santa}>
                    <td>{pair.santa}</td>
                    <td>{pair.recipient}</td>
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
              {pairs[0] && (
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() => setPersonal(pairs[0]!)}
                >
                  {t('quick.link')}
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <section className="panel" style={{ gridColumn: '1 / -1' }}>
        <h2>{t('quick.personalKicker')}</h2>
        <p className="panel__sub">{t('quick.personalNote')}</p>
        {personal ? (
          <>
            <p>
              {t('quick.personalHello', { name: personal.santa })} — {t('quick.personalLabel')}{' '}
              <strong>{personal.recipient}</strong>
            </p>
            <p className="field-hint">{t('quick.personalWarning')}</p>
            <div className="btn-row">
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => void copy(personalLink, 'quick.linkCopied')}
              >
                {t('quick.personalCopy')}
              </button>
            </div>
          </>
        ) : (
          <p className="panel__sub">{t('dash.recipientNone')}</p>
        )}
      </section>
    </div>
  );
}
