import { createFileRoute } from '@tanstack/react-router';
import { QuickDrawPage } from '../pages/QuickDrawPage.tsx';

export const Route = createFileRoute('/quick-draw')({
  component: QuickDrawPage,
});
