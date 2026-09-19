import { useState } from 'react';
import { Sheet, ui } from '../ui';
import { CheckIcon } from '../ui/Icons';

export function SaveSheet({
  boardName,
  setName,
  existing,
  onClose,
  onSave,
}: {
  boardName: string;
  setName: string;
  /** 同じ Board.id が保存済みかどうか */
  existing: boolean;
  onClose: () => void;
  onSave: (boardName: string, setName: string) => void;
}) {
  const [board, setBoard] = useState(boardName);
  const [name, setName_] = useState(setName);

  return (
    <Sheet onClose={onClose}>
      <input
        className={ui.field}
        value={board}
        autoFocus={!boardName}
        placeholder=""
        onChange={(e) => setBoard(e.target.value)}
      />
      {existing && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            color: 'var(--ink-weak)',
            padding: '4px 4px 0',
          }}
        >
          <CheckIcon size={14} />
        </div>
      )}
      <div style={{ height: 10 }} />
      <input
        className={ui.field}
        value={name}
        onChange={(e) => setName_(e.target.value)}
      />
      <button className={ui.primary} onClick={() => onSave(board.trim(), name.trim())}>
        保存
      </button>
    </Sheet>
  );
}
