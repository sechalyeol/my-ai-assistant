// Last Updated: 2025-12-10 15:03:34
// [tailwind.config.js] - 폰트 설정 변경
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 상용 앱 수준의 다크 테마 팔레트
        background: '#09090b',
        surface: '#18181b',
        surfaceHighlight: '#27272a',
        border: '#27272a',
        primary: '#6366f1',
        primaryHover: '#4f46e5',
        textMain: '#fafafa',
        textMuted: '#a1a1aa',
      },
      fontFamily: {
        // 💡 수정됨: Inter -> Pretendard
        sans: ['Pretendard', 'sans-serif'], 
      }
    },
  },
  plugins: [],
}