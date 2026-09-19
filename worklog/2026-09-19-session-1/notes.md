# セッションメモ 2026-09-19 session-1

## 前提
- 仕様書は `docs/spec.md`（`~/Downloads/Meowdoku メモツール 仕様書.md` のコピー）
- 実装順は仕様 §14.1〜8。1〜3（盤面・スクラバー・インポート層）を先に動かす方針
- Tailwind 不使用 / CSS Modules + CSS Custom Properties
- バックエンド通信ゼロ、画像はアップロードしない

## 環境
- node v24.15.0 / npm 11.12.1
- Vite 8 / React 19 / TS 6（scaffold 時点の最新）

## 決めたこと・気づき
