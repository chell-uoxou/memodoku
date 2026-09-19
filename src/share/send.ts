/**
 * 共有リンクを渡す。
 *
 * iOS Safari では `navigator.share` も `clipboard.writeText` も
 * **タップと同じタスクの中**で呼ばないと弾かれる。共有ペイロードの作成は
 * 非同期（CompressionStream）なので、URL は先に作っておいてここには
 * 出来上がった文字列だけを渡すこと。
 *
 * 返り値は画面に出す文言。null なら何も出さなくてよい。
 */
export function shareLink(url: string, title: string): Promise<string | null> {
  if (navigator.share) {
    return navigator.share({ title, url }).then(
      () => null, // OS の共有シートが出たので通知は不要
      (e: unknown) => {
        // ユーザーが閉じただけなら何も出さない
        if (e instanceof DOMException && e.name === 'AbortError') return null;
        return copy(url);
      },
    );
  }
  return copy(url);
}

function copy(url: string): Promise<string | null> {
  return navigator.clipboard.writeText(url).then(
    () => 'リンクをコピーしました',
    () => 'リンクをコピーできませんでした',
  );
}
