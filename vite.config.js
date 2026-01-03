// Last Updated: 2026-01-03 23:12:48
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // 이 줄이 필요합니다

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // @를 src 폴더로 지정
    },
  },
})