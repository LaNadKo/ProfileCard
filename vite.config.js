import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const metadata = {
    SITE_TITLE: env.VITE_SITE_TITLE || 'Profile',
    SITE_DESCRIPTION: env.VITE_SITE_DESCRIPTION || '',
    SITE_URL: env.VITE_SITE_URL || '',
    SITE_NAME: env.VITE_SITE_NAME || env.VITE_SITE_TITLE || 'Profile',
    SITE_IMAGE_URL: env.VITE_SITE_IMAGE_URL || '',
    SITE_IMAGE_ALT: env.VITE_SITE_IMAGE_ALT || '',
    SITE_IMAGE_TYPE: env.VITE_SITE_IMAGE_TYPE || '',
    SITE_IMAGE_WIDTH: env.VITE_SITE_IMAGE_WIDTH || '',
    SITE_IMAGE_HEIGHT: env.VITE_SITE_IMAGE_HEIGHT || '',
    SITE_LANGUAGE: env.VITE_SITE_LANGUAGE || 'en',
    FAVICON_PATH: env.VITE_FAVICON_PATH || '/favicon.svg',
  }

  return {
    plugins: [
      react(),
      {
        name: 'html-runtime-metadata',
        transformIndexHtml(html) {
          return Object.entries(metadata).reduce(
            (result, [key, value]) => result.replaceAll(`{{${key}}}`, escapeHtml(value)),
            html,
          )
        },
      },
    ],
  }
})
