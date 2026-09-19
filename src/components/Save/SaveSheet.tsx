import { useState } from 'react';
import { Sheet, ui } from '../ui';

/** 盤面名とメモ名を編集するシート。保存にも名前変更にも使う */
export function SaveSheet({
  title,
  boardName,
  setName,
  existing,
  onClose,
  onSubmit,
}: {
  title: string;
  boardName: string;
  setName: string;
  /** 同じ形の盤面が既に保存されているか */
  existing: boolean;
  onClose: () => void;
  onSubmit: (boardName: string, setName: string) => void;
}) {
  const [board, setBoard] = useState(boardName);
  const [name, setName_] = useState(setName);

  return (
    <Sheet onClose={onClose} title={title}>
      <div className={ui.fieldLabel}>メモ名</div>
      <input
        className={ui.field}
        value={name}
        placeholder="例: 2026/09/19"
        onChange={(e) => setName_(e.target.value)}
      />
      <div className={ui.fieldLabel} style={{ paddingTop: 14 }}>
        盤面名（ゲームのレベル名）
        {existing && <span className={ui.fieldNote}>保存済みの盤面と同じ形です</span>}
      </div>
      <input
        className={ui.field}
        value={board}
        placeholder="例: Level 62 / Daily 9/19"
        onChange={(e) => setBoard(e.target.value)}
      />
      <button className={ui.primary} onClick={() => onSubmit(board.trim(), name.trim() || setName)}>
        保存
      </button>
    </Sheet>
  );
}
