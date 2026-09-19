import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

// 静的ホスティング（GitHub Pages / Cloudflare Pages 等）に置く前提。
// サブパス配信になる場合は base を書き換える。
// 実機から開くときは https にする。crypto.subtle とクリップボード読み取りは
// セキュアコンテキストでしか動かないため。
// 自己署名証明書を嫌う環境では `npm run dev:http` で平文に落とせる。
const useHttps = !process.env.VITE_HTTP;

export default defineConfig({
  base: './',
  plugins: [
    react(),
    ...(useHttps ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      // アプリシェルだけをキャッシュする。盤面データは IndexedDB にある
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // tesseract の言語データは実行時に取りに行くのでキャッシュ対象外
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'memodoku',
        short_name: 'memodoku',
        description: 'Meowdokuの盤面を読み込み、メモ、共有',
        start_url: './',
        display: 'standalone',
        background_color: '#F6EFE7',
        theme_color: '#F6EFE7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
