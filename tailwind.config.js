module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}"
    ],
    safelist: [
      {
        pattern: /bg-\[\#.*\]/, // allow any bg-[#hex] usage
      }
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }