import { useI18n } from '../../app/providers/i18n.tsx';

const WISH_PRESETS = [
  'preset.wish.1',
  'preset.wish.2',
  'preset.wish.3',
  'preset.wish.4',
  'preset.wish.5',
  'preset.wish.6',
  'dash.tplSize',
  'dash.tplAddress',
  'dash.tplAllergy',
  'dash.tplThanks',
] as const;

const ANTI_PRESETS = [
  'preset.anti.1',
  'preset.anti.2',
  'preset.anti.3',
  'preset.anti.4',
  'preset.anti.5',
  'preset.anti.6',
] as const;

export function WishPresets({
  wishes,
  onAdd,
}: {
  wishes: string[];
  onAdd: (text: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="presets">
      <h3>{t('dash.presetWishTitle')}</h3>
      <div className="preset-chips">
        {WISH_PRESETS.map((key) => {
          const text = t(key);
          const added = wishes.includes(text);
          return (
            <button
              key={key}
              type="button"
              className="preset-chip"
              data-added={added}
              aria-pressed={added}
              onClick={() => onAdd(text)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AntiPresets({
  value,
  onSet,
}: {
  value: string;
  onSet: (text: string) => void;
}) {
  const { t } = useI18n();
  const chips = [
    ...ANTI_PRESETS.map((key) => ({ label: t(key), value: t(key) })),
    { label: t('dash.profileAntiLabel'), value: t('dash.profileAntiPh') },
  ];

  return (
    <div className="presets">
      <h3>{t('dash.presetAntiTitle')}</h3>
      <div className="preset-chips" role="group" aria-label={t('dash.profileAntiLabel')}>
        {chips.map((chip) => {
          const added = value.includes(chip.value);
          return (
            <button
              key={chip.label}
              type="button"
              className="preset-chip preset-chip--anti"
              data-added={added}
              aria-pressed={added}
              onClick={() => onSet(chip.value)}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
