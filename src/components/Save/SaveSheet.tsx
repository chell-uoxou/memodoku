import { useState } from 'react';
import { Sheet, ui } from '../ui';

export function SaveSheet({
  boardName,
  setName,
  existing,
  onClose,
  onSave,
}: {
  boardName: string;
  setName: string;
  /** 同じ Board.id が既に保存されているか */
  existing: boolean;
  onClose: () => void;
  onSave: (boardName: string, setName: string) => void;
}) {
  const [board, setBoard] = useState(boardName);
  const [name, setName_] = useState(setName);

  return (
    <Sheet onClose={onClose} title="保存">
      <div className={ui.fieldLabel}>
        盤面名
        {existing && <span className={ui.fieldNote}>保存済みの盤面と同じ形です</span>}
      </div>
      <input
        className={ui.field}
        value={board}
        autoFocus={!boardName}
        placeholder="例: Level 62 / Daily 9/19"
        onChange={(e) => setBoard(e.target.value)}
      />
      <div className={ui.fieldLabel} style={{ paddingTop: 14 }}>
        メモセット名
      </div>
      <input
        className={ui.field}
        value={name}
        placeholder="例: 2026/09/19"
        onChange={(e) => setName_(e.target.value)}
      />
      <button className={ui.primary} onClick={() => onSave(board.trim(), name.trim())}>
        保存
      </button>
    </Sheet>
  );
}
