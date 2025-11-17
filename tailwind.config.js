// Last Updated: 2025-11-18 01:11:26
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 👈 [중요] 이 줄이 있어야 버튼으로 테마를 바꿀 수 있습니다!
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 상용 앱 수준의 다크 테마 팔레트 (Linear 스타일)
        background: '#09090b', // 완전한 검정보다는 아주 깊은 회색
        surface: '#18181b',    // 카드나 사이드바 배경
        surfaceHighlight: '#27272a', // 호버 시 배경
        border: '#27272a',     // 아주 은은한 테두리
        primary: '#6366f1',    // 고급스러운 인디고 (Indigo-500)
        primaryHover: '#4f46e5',
        textMain: '#fafafa',   // 거의 흰색
        textMuted: '#a1a1aa',  // 차분한 회색
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // 전문적인 느낌의 폰트
      }
    },
  },
  plugins: [],
}