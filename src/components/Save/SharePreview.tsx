import { useEffect, useState } from 'react';
import { Sheet } from '../ui';
import { SHARE_MESSAGE, type SharePayload } from '../../share/send';
import s from './SharePreview.module.css';

/**
 * 何が送られるのかを見せてから共有する。
 * 「共有する」の onClick から navigator.share を直接呼ぶので、
 * iOS のユーザー操作の制約も満たせる。
 */
export function SharePreview({
  payload,
  onClose,
  onCopy,
  onShare,
}: {
  payload: SharePayload;
  onClose: () => void;
  onCopy: () => void;
  onShare: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!payload.image) return;
    const url = URL.createObjectURL(payload.image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [payload.image]);

  return (
    <Sheet onClose={onClose} title="この内容で共有します">
      {preview && (
        <div className={s.imageBox}>
          <img src={preview} alt="共有される盤面" draggable={false} />
        </div>
      )}
      <div className={s.text}>
        <span>{SHARE_MESSAGE}</span>
        <span className={s.url}>{payload.url}</span>
      </div>
      {!payload.image && <div className={s.note}>画像は準備できませんでした</div>}
      <div className={s.buttons}>
        <button className={s.cancel} onClick={onClose}>
          キャンセル
        </button>
        <button className={s.copy} onClick={onCopy}>
          リンクをコピー
        </button>
        <button className={s.share} onClick={onShare}>
          共有する
        </button>
      </div>
    </Sheet>
  );
}
