import type { AssignmentView } from '@secret-santa/shared/contracts';
import { useI18n } from '../../app/providers/i18n.tsx';
import { Scene } from '../../shared/ui/Scene.tsx';

type Recipient = AssignmentView['recipient'];

const PROFILE_LABELS: Record<string, string> = {
  address: 'dash.profileAddressLabel',
  note: 'dash.profileNoteLabel',
  antiWishlist: 'dash.profileAntiLabel',
  size: 'dash.profileSizeLabel',
  links: 'dash.profileLinksLabel',
  allergies: 'dash.profileAllergiesLabel',
};

export function RevealCard({
  recipient,
  drawn,
  revealed,
  onReveal,
}: {
  recipient: Recipient;
  drawn: boolean;
  revealed: boolean;
  onReveal: () => void;
}) {
  const { t } = useI18n();

  if (!drawn || !recipient) {
    return (
      <section className="panel" aria-labelledby="recipient-title">
        <h2 id="recipient-title">{t('dash.recipientTitle')}</h2>
        <p className="panel__sub">{t('dash.recipientSub')}</p>
        <div className="empty-state">
          <Scene id="recipient-waiting" />
          <p>{t('dash.recipientNone')}</p>
        </div>
      </section>
    );
  }

  if (!revealed) {
    return (
      <section className="panel reveal-card" aria-labelledby="recipient-title">
        <h2 id="recipient-title">{t('dash.recipientTitle')}</h2>
        <p className="panel__sub">{t('dash.recipientReady')}</p>
        <div className="empty-state">
          <span className="reveal-card__hidden">{t('v69.reveal.hidden')}</span>
          <button
            id="reveal-btn"
            type="button"
            className="btn btn--primary"
            aria-label={t('dash.reveal')}
            onClick={onReveal}
          >
            {t('v69.reveal.cta')}
          </button>
        </div>
      </section>
    );
  }

  const profile = Object.entries(recipient.profile).filter(([key, value]) => PROFILE_LABELS[key] && value);

  return (
    <section className="panel reveal-card animated zoomIn motion-reveal" aria-labelledby="recipient-title">
      <h2 id="recipient-title">{t('dash.recipientTitle')}</h2>
      <h3
        className="reveal-card__name"
        title={t('dash.recipientYou', { name: recipient.name }).replace(/<[^>]+>/g, '')}
      >
        {recipient.name}
      </h3>
      <h4>{t('dash.recipientWishlist')}</h4>
      {recipient.wishlist.length === 0 ? (
        <p className="panel__sub">{t('dash.recipientWishlistEmpty')}</p>
      ) : (
        <ul className="list">
          {recipient.wishlist.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
        </ul>
      )}
      <h4>{t('dash.recipientProfileTitle')}</h4>
      {profile.length === 0 ? (
        <p className="panel__sub">{t('dash.recipientProfileEmpty')}</p>
      ) : (
        <ul className="list">
          {profile.map(([key, value]) => (
            <li key={key}>
              <strong>{t(PROFILE_LABELS[key]!)}:</strong> {value}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
