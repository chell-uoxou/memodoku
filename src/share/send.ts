/** URL の前に添える文言 */
export const SHARE_MESSAGE = 'MemodokuでMeowdokuの盤面のメモが共有されました：';

export type SharePayload = {
  title: string;
  url: string;
  image: File | null;
};

/** 共有シートやクリップボードに渡す本文 */
export function shareBody(url: string): string {
  return `${SHARE_MESSAGE}\n${url}`;
}

/**
 * 共有する。盤面の画像があれば一緒に送る（LINE などで見た目が伝わるように）。
 *
 * iOS Safari では `navigator.share` も `clipboard.writeText` も
 * **タップと同じタスクの中**で呼ばないと弾かれる。確認ダイアログの「共有する」から
 * 直接呼ぶこと。リンクと画像は先に作っておく。
 *
 * 返り値は画面に出す文言。null なら何も出さなくてよい。
 */
export function shareLink({ title, url, image }: SharePayload): Promise<string | null> {
  const body = shareBody(url);
  if (navigator.share) {
    const withFile =
      image && navigator.canShare?.({ files: [image] })
        ? { title, text: body, files: [image] }
        : null;
    const payload = withFile ?? { title, text: SHARE_MESSAGE, url };
    return navigator.share(payload).then(
      () => null, // OS の共有シートが出たので通知は不要
      (e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return null;
        // 画像付きで断られたらリンクだけでもう一度試す
        if (withFile) {
          return navigator.share({ title, text: SHARE_MESSAGE, url }).then(
            () => null,
            () => copy(body),
          );
        }
        return copy(body);
      },
    );
  }
  return copy(body);
}

function copy(body: string): Promise<string | null> {
  return writeClipboard(body).then(copyMessage);
}

/**
 * リンクだけをクリップボードに入れる。共有シートの「リンクをコピー」から呼ぶ。
 * 案内文は付けない。アドレスバーにそのまま貼れるようにしたいため。
 * `navigator.share` と同じく、タップと同じタスクの中で呼ぶこと。
 */
export function copyShareLink(url: string): Promise<string> {
  return writeClipboard(url).then(copyMessage);
}

function copyMessage(ok: boolean): string {
  return ok ? 'リンクをコピーしました' : 'リンクをコピーできませんでした';
}

/** 非セキュアコンテキストでは navigator.clipboard 自体が無いので、触る前に確かめる */
function writeClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return Promise.resolve(false);
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false,
  );
}

/**
 * 盤面の画像だけを保存させる。
 * iOS には blob のダウンロードで写真に入れる手段が無いので、
 * 画像だけを共有シートに渡して「写真に保存」を選んでもらう。
 * 共有シートが使えない環境ではそのままダウンロードする。
 */
export function saveImage(image: File): Promise<string | null> {
  if (navigator.canShare?.({ files: [image] })) {
    return navigator.share({ files: [image] }).then(
      () => null,
      (e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return null;
        return download(image);
      },
    );
  }
  return Promise.resolve(download(image));
}

function download(image: File): string | null {
  try {
    const url = URL.createObjectURL(image);
    const a = document.createElement('a');
    a.href = url;
    a.download = image.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return '画像を保存しました';
  } catch {
    return '画像を保存できませんでした';
  }
}
