import { useId, useMemo } from 'react';
import { renderSceneSvg } from '@secret-santa/art';
import type { SceneId } from '@secret-santa/art';
import { useSettings } from '../../app/providers/settings.tsx';

export function Scene({ id, className }: { id: SceneId; className?: string }) {
  const { theme } = useSettings();
  // useId стабилен между SSR и гидратацией; префикс убирает «:» из CSS-ссылок.
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const svg = useMemo(() => renderSceneSvg(id, theme, instance), [id, theme, instance]);
  return <div className={`scene ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
