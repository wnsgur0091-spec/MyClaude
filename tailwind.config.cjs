const forms = require('@tailwindcss/forms');
const containerQueries = require('@tailwindcss/container-queries');

module.exports = {
  content: ['./fitcheck/index.html', './fitcheck/app.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#eae6ff',
        'secondary-container': '#d5e7de',
        secondary: '#e2f4eb',
        'tertiary-container': '#f6e6e1',
        tertiary: '#ffefea',
        cream: '#fff9e6',
        'on-background': '#000000',
        'on-surface-variant': '#47464c',
        'error-container': '#ffdad6',
        error: '#ba1a1a',
      },
      spacing: {
        unit: '4px',
        gutter: '16px',
        'stroke-weight': '3px',
        'margin-desktop': '40px',
        'margin-mobile': '20px',
        'shadow-offset': '4px',
      },
      fontFamily: {
        body: ['Lexend', 'sans-serif'],
        headline: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [forms, containerQueries],
};
