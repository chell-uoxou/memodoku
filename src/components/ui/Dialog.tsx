import { useCallback, useState, type ReactNode } from 'react';
import s from './ui.module.css';

export type DialogRequest = {
  title: string;
  message?: string;
  /** 決定ボタンの文言 */
  confirmLabel?: string;
  /** null にすると決定ボタンだけの通知になる */
  cancelLabel?: string | null;
  danger?: boolean;
};

type Pending = DialogRequest & { resolve: (ok: boolean) => void };

/**
 * ブラウザの confirm / alert の代わり。
 * 見た目を揃えたいのと、iOS だとページ全体が固まるのを避けたいため自前で出す。
 */
export function useDialogs() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (request: DialogRequest) =>
      new Promise<boolean>((resolve) => setPending({ ...request, resolve })),
    [],
  );

  const notify = useCallback(
    (title: string, message?: string) =>
      confirm({ title, message, cancelLabel: null, confirmLabel: 'OK' }).then(() => undefined),
    [confirm],
  );

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const element: ReactNode = pending ? (
    <>
      <div className={s.backdrop} onClick={() => close(false)} />
      <div className={s.dialogWrap}>
        <div className={s.dialog} role="alertdialog">
          <div className={s.dialogTitle}>{pending.title}</div>
          {pending.message && <div className={s.dialogMessage}>{pending.message}</div>}
          <div className={s.dialogButtons}>
            {pending.cancelLabel !== null && (
              <button className={s.dialogCancel} onClick={() => close(false)}>
                {pending.cancelLabel ?? 'キャンセル'}
              </button>
            )}
            <button
              className={`${s.dialogConfirm} ${pending.danger ? s.dialogDanger : ''}`}
              onClick={() => close(true)}
            >
              {pending.confirmLabel ?? 'OK'}
            </button>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return { confirm, notify, element };
}

export type Confirm = ReturnType<typeof useDialogs>['confirm'];
