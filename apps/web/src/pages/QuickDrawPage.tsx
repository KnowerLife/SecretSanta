import { useI18n } from '../app/providers/i18n.tsx';
import { QuickDrawTool } from '../features/quick-draw/QuickDrawTool.tsx';

export function QuickDrawPage() {
  const { t } = useI18n();
  return (
    <div className="container dashboard">
      <div className="dashboard__head">
        <div>
          <span className="kicker">{t('quick.kicker')}</span>
          <h1>{t('quick.title')}</h1>
        </div>
      </div>
      <QuickDrawTool />
    </div>
  );
}
