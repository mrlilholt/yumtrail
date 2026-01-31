module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pine: {
          50: "#ecf7f2",
          100: "#d4f0e3",
          200: "#aee3c8",
          300: "#83d6ab",
          400: "#6dc888",
          500: "#4fb16f",
          600: "#379455",
          700: "#2c7a46",
          800: "#226036",
          900: "#15694c"
        },
        moss: {
          50: "#f2fbf6",
          100: "#d7f4e2",
          200: "#b1eacb",
          300: "#8eddb3",
          400: "#6dc888",
          500: "#52b16f",
          600: "#3c8f59",
          700: "#2f7247",
          800: "#245836",
          900: "#1a3e27"
        },
        bark: {
          100: "#f6f7f9",
          200: "#e3e9ef",
          300: "#c8d4df",
          400: "#a7b6c4",
          500: "#8798a8",
          600: "#6b7b8a",
          700: "#54606d",
          800: "#3e4650",
          900: "#2c3138"
        },
        mist: {
          50: "#f5fdff",
          100: "#c5e9f5",
          200: "#81ebef",
          300: "#74d9e8",
          400: "#5fc6dd",
          500: "#3fb0c8",
          600: "#2f8ea6",
          700: "#25728a",
          800: "#1b5464",
          900: "#143c48"
        },
        sun: {
          100: "#fdf9c7",
          200: "#f2ee74",
          300: "#e7dd3d",
          400: "#d5cc1c",
          500: "#b9b214",
          600: "#98920f",
          700: "#79750d",
          800: "#5a570a",
          900: "#403e08"
        }
      },
      fontFamily: {
        display: ["Now", "Fredoka", "sans-serif"],
        body: ["Now", "Quicksand", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 25px 60px -40px rgba(18, 50, 39, 0.55)",
        card: "0 18px 35px -32px rgba(18, 50, 39, 0.5)"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }
        },
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" }
        },
        glow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" }
        },
        leaf: {
          "0%": { transform: "translateX(0) translateY(0)", opacity: "0.2" },
          "50%": { opacity: "0.6" },
          "100%": { transform: "translateX(-14px) translateY(8px)", opacity: "0.2" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out both",
        "float-slow": "float-slow 9s ease-in-out infinite",
        bob: "bob 3s ease-in-out infinite",
        float: "float 8s ease-in-out infinite",
        glow: "glow 2.6s ease-in-out infinite",
        leaf: "leaf 6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
