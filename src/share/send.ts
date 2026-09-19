/**
 * 共有リンクを渡す。
 * iOS などで Web Share が使えるときは OS の共有シートを開き、
 * 使えなければクリップボードにコピーする。返り値は画面に出す文言。
 */
export async function shareLink(url: string, title: string): Promise<string | null> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return null; // 共有シートが出たので通知は不要
    } catch (e) {
      // ユーザーが閉じただけなら何も出さない
      if (e instanceof DOMException && e.name === 'AbortError') return null;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'リンクをコピーしました';
  } catch {
    return 'リンクをコピーできませんでした';
  }
}
