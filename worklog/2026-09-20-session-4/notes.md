# セッションメモ 2026-09-20 session-4

## このセッションの依頼
GitHub Actions で GitHub Pages へのデプロイを自動化したい。

## 分かったこと
- `vite.config.ts` の `base: './'` のままでプロジェクトページ（`/meowdoku-memo/`）でも動く。
  ビルド出力の index.html / registerSW.js / manifest.webmanifest がすべて相対パスになり、
  Service Worker の scope も `./` なのでサブパス配信で破綻しない。base の書き換えは不要。
- Pages の公開方式は「ブランチ（gh-pages）」ではなく Settings > Pages > Source = GitHub Actions を選ぶ方式。
  これはリポジトリ設定側の操作なのでワークフローだけでは完結しない。
- `npm run lint`（oxlint）は warning のみで exit 0。CI を落とさない。テストは 32 件すべて通る。

## 残り
- 初回は main に push したあと、リポジトリ設定で Source = GitHub Actions に切り替える必要がある。
