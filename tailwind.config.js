module.exports = {
  content: [
    "./interactive_resume_workspace_v2.html",
    "./interactive_resume_workspace_v2.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a"
        }
      }
    }
  },
  darkMode: "class"
};
