import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Local Dev Server API Middleware for real HTTP network requests & storage
function mockApiPlugin() {
  const storedSurveys: any[] = [];

  return {
    name: 'vku-mock-api',
    configureServer(server: any) {
      server.middlewares.use('/api/surveys', (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            let parsed: any = {};
            try { parsed = JSON.parse(body); } catch {}
            if (parsed && parsed.uuid) {
              const existingIndex = storedSurveys.findIndex((s) => s.uuid === parsed.uuid);
              const record = {
                uuid: parsed.uuid,
                createdAt: parsed.createdAt || new Date().toISOString(),
                syncedAt: new Date().toISOString(),
                status: 'SYNCED',
                retryCount: 0,
                data: parsed.data
              };
              if (existingIndex >= 0) {
                storedSurveys[existingIndex] = record;
              } else {
                storedSurveys.unshift(record);
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              status: 'SUCCESS',
              message: 'Phiếu khảo sát đã được lưu vào Cơ sở dữ liệu Cloud!',
              receivedUuid: parsed?.uuid,
              serverTimestamp: new Date().toISOString(),
              node: 'Vite Local Cloud Simulator'
            }));
          });
        } else if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({
            status: 'ONLINE',
            service: 'VKU Field Survey Backend API',
            count: storedSurveys.length,
            surveys: storedSurveys,
            timestamp: new Date().toISOString()
          }));
        } else {
          next();
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mockApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'VKU Field Survey - Offline Data Collection',
        short_name: 'VKU Survey',
        description: 'Offline-first campus facility inspection and audit application for VKU',
        theme_color: '#0284c7',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Cache-First strategy for static assets (images, fonts, stylesheets)
            urlPattern: ({ request }) =>
              request.destination === 'style' ||
              request.destination === 'script' ||
              request.destination === 'worker' ||
              request.destination === 'font' ||
              request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'vku-app-shell-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache navigation requests (HTML) with Cache-First fallback for instant offline boot
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'CacheFirst',
            options: {
              cacheName: 'vku-html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 7 Days
              }
            }
          }
        ]
      }
    })
  ]
});
