import { useEffect, useState } from 'react';
import type { Board, Marks, MemoSet } from './model/types';
import { blankSetup, Setup, type SetupInput } from './components/Setup/Setup';
import { MemoSession } from './components/Memo/MemoSession';
import { newMemoSet } from './state/memoSet';
import { suppressBrowserGestures } from './gestures';
import { IconButton } from './components/ui';
import { PlusIcon } from './components/ui/Icons';
import './styles/global.css';
import app from './App.module.css';

type View =
  | { kind: 'home' }
  | { kind: 'setup'; input: SetupInput }
  | { kind: 'memo'; board: Board; memoSet: MemoSet };

export default function App() {
  const [view, setView] = useState<View>({ kind: 'home' });

  useEffect(suppressBrowserGestures, []);

  if (view.kind === 'setup') {
    return (
      <Setup
        input={view.input}
        onCancel={() => setView({ kind: 'home' })}
        onDone={(board: Board, imported: Marks) =>
          setView({ kind: 'memo', board, memoSet: newMemoSet(board, imported) })
        }
      />
    );
  }

  if (view.kind === 'memo') {
    return (
      <MemoSession
        key={view.memoSet.id}
        board={view.board}
        initialMemoSet={view.memoSet}
        onBack={() => setView({ kind: 'home' })}
      />
    );
  }

  return (
    <div className={app.home}>
      <div className={app.fab}>
        <IconButton onClick={() => setView({ kind: 'setup', input: blankSetup(9) })} title="新規">
          <PlusIcon />
        </IconButton>
      </div>
    </div>
  );
}
