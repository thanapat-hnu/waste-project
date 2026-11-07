import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // โดเมนจริงของเว็บ (เช่น https://xxx.vercel.app) ใช้ทำลิงก์รูปตัวอย่างตอนแชร์ (og:image ต้องเป็น URL เต็ม)
  // ตั้งใน .env.local / Vercel Environment Variables ชื่อ VITE_SITE_URL · ไม่ตั้งจะใช้ path สั้นแทน
  const siteUrl = (loadEnv(mode, process.cwd(), '').VITE_SITE_URL || '').replace(/\/$/, '')
  return {
    plugins: [
      react(),
      {
        name: 'site-url-in-html',
        transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
      },
    ],
    server: {
      // ให้เปิดผ่าน ngrok ได้ (แชร์ให้ทีมเช็ค)
      allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev'],
    },
  }
})
