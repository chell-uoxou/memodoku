import { useEffect, useState } from 'react';
import { Sheet, ui } from '../ui';
import { useStoredValue } from '../../state/settings';

/** 保存先がこのブラウザだけだと分かっていない人がいるので、初回だけ伝える */
const NOTICE_KEY = 'meowdoku-memo:storageNoticeSeen';

// JSX に直接書くと改行の位置に空白が入ってしまうので、文字列にしておく
const NOTICE =
  'メモはこのブラウザの中だけに保存されます。別の端末やブラウザからは見られず、' +
  'ブラウザのデータを消すと一緒に消えます。他の端末に移すときは共有リンクを使ってください。';

/** 盤面名とメモ名を編集するシート。保存にも名前変更にも使う */
export function SaveSheet({
  title,
  boardName,
  setName,
  existing,
  saving,
  onClose,
  onSubmit,
}: {
  title: string;
  boardName: string;
  setName: string;
  /** 同じ形の盤面が既に保存されているか */
  existing: boolean;
  /** 保存として開いたか（名前の変更ではなく） */
  saving?: boolean;
  onClose: () => void;
  onSubmit: (boardName: string, setName: string) => void;
}) {
  const [board, setBoard] = useState(boardName);
  const [name, setName_] = useState(setName);

  // 開いた時点で判定して固定する。閉じるまで文面が消えないようにするため
  const [noticeSeen, setNoticeSeen] = useStoredValue<'' | '1'>(NOTICE_KEY, '');
  const [showNotice] = useState(() => Boolean(saving) && noticeSeen !== '1');
  useEffect(() => {
    if (showNotice) setNoticeSeen('1');
  }, [showNotice, setNoticeSeen]);

  return (
    <Sheet onClose={onClose} title={title}>
      {showNotice && <div className={ui.notice}>{NOTICE}</div>}
      <div className={ui.fieldLabel}>メモ名</div>
      <input
        className={ui.field}
        value={name}
        placeholder="例: 2026/09/19"
        onChange={(e) => setName_(e.target.value)}
      />
      <div className={ui.fieldLabel} style={{ paddingTop: 14 }}>
        盤面名（ゲームのレベル名）
        {existing && <span className={ui.fieldNote}>すでに同じ盤面が存在します</span>}
      </div>
      <input
        className={ui.field}
        value={board}
        placeholder="例: Level 62 / Daily 9/19"
        // 既にある盤面に取り込むだけなので、ここから名前は変えさせない
        disabled={existing}
        onChange={(e) => setBoard(e.target.value)}
      />
      <button className={ui.primary} onClick={() => onSubmit(board.trim(), name.trim() || setName)}>
        保存
      </button>
    </Sheet>
  );
}
