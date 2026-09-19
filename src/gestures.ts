/** §7.2 ブラウザの既定ジェスチャを抑止する。アプリ起動時に一度だけ呼ぶ。 */
export function suppressBrowserGestures() {
  const prevent = (e: Event) => e.preventDefault();

  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(t, prevent, { passive: false });
  }
  document.addEventListener('dblclick', prevent, { passive: false });
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('dragstart', prevent);
}
