import type { ReactNode, RefObject } from 'react';
import { Modal } from '@mantine/core';
import { useI18n } from '../../app/providers/i18n.tsx';

/**
 * Подтверждение разрушительного действия. Mantine возвращает фокус сам,
 * дополнительно возвращаем его на кнопку-триггер при отмене.
 */
export function ConfirmDialog({
  opened,
  title,
  children,
  triggerRef,
  onConfirm,
  onCancel,
}: {
  opened: boolean;
  title: string;
  children: ReactNode;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  const cancel = () => {
    const trigger = triggerRef.current;
    onCancel();
    window.setTimeout(() => (trigger ?? triggerRef.current)?.focus(), 0);
  };

  return (
    <Modal
      opened={opened}
      onClose={cancel}
      title={title}
      size="480px"
      closeButtonProps={{ 'aria-label': t('confirm.close') }}
      centered
      trapFocus
      returnFocus
    >
      <div className="confirm-dialog">
        <div className="confirm-dialog__body">{children}</div>
        <div className="btn-row confirm-dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={cancel}>
            {t('confirm.cancel')}
          </button>
          <button type="button" className="btn btn--accent" onClick={onConfirm}>
            {t('confirm.ok')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
