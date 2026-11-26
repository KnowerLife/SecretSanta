import { useMemo } from 'react';
import { renderSceneSvg } from '@secret-santa/art';
import type { SceneId } from '@secret-santa/art';
import { useSettings } from '../../app/providers/settings.tsx';

export function Scene({ id, className }: { id: SceneId; className?: string }) {
  const { theme } = useSettings();
  const svg = useMemo(() => renderSceneSvg(id, theme), [id, theme]);
  return <div className={`scene ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
