/**
 * 共有リンクを渡す。盤面の画像があれば一緒に送る（LINE などで見た目が伝わるように）。
 *
 * iOS Safari では `navigator.share` も `clipboard.writeText` も
 * **タップと同じタスクの中**で呼ばないと弾かれる。リンクも画像も作るのが非同期なので、
 * ここには出来上がったものだけを渡すこと。
 *
 * 返り値は画面に出す文言。null なら何も出さなくてよい。
 */
export function shareLink(
  url: string,
  title: string,
  image?: File | null,
): Promise<string | null> {
  if (navigator.share) {
    // 画像を受け付けるかは端末とブラウザによる
    const withFile =
      image && navigator.canShare?.({ files: [image] })
        ? { title, text: url, files: [image] }
        : null;
    const payload = withFile ?? { title, url };
    return navigator.share(payload).then(
      () => null, // OS の共有シートが出たので通知は不要
      (e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return null;
        // 画像付きで断られたらリンクだけでもう一度試す
        if (withFile) {
          return navigator.share({ title, url }).then(
            () => null,
            () => copy(url),
          );
        }
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
