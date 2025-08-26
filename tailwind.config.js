/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 启用 class 模式的深色主题
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Segoe UI Variable Text', 'Segoe UI', 'SF Pro Text', 'Roboto',
          'Noto Sans SC', 'Microsoft YaHei', 'Helvetica Neue', 'Arial',
          'system-ui', '-apple-system', 'Apple Color Emoji', 'Segoe UI Emoji'
        ]
      },
      colors: {
        primary: {
          DEFAULT: '#0078D4', // 浅色主按钮/高亮
          600: '#006CBE',
          dark: '#00A4EF',    // 深色高亮蓝（霓虹感）
        },
      },
      boxShadow: {
        'card-light': '0 10px 30px -10px rgba(14, 93, 167, .25)',
        'card-dark': '0 10px 30px -10px rgba(0, 164, 239, .25)',
      }
    },
  },
  plugins: [],
}
