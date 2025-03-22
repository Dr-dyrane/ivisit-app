/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class", // Enables class-based dark mode
	content: [
		"./App.{js,jsx,ts,tsx}",
		"./app/**/*.{js,jsx,ts,tsx}",
		"./screens/**/*.{js,jsx,ts,tsx}",
		"./components/**/*.{js,jsx,ts,tsx}",
		"./contexts/**/*.{js,jsx,ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
				// 🟡 Borders & Inputs
				border: {
					DEFAULT: "#d0d5dd", // Light Gray Border
					dark: "#2a2a2a", // Dark Gray Border
				},

				input: {
					DEFAULT: "#d0d5dd", // Light Gray Input
					dark: "#3a3f47", // Dark Gray Input
				},

				ring: {
					DEFAULT: "#b91c1c", // Dark Red Ring (Focus)
					dark: "#f87171", // Soft Red Ring in Dark Mode
				},

				// 🔵 Background & Foreground
				background: {
					DEFAULT: "#fafafa", // Off-White Background
					dark: "#0D121D", // Deep Blue for Dark Mode
					foreground: "#1a1a1a", // Almost Black Text for Light Mode
					foregroundDark: "#e3e6ed", // Light Gray Text for Dark Mode
				},
				// 🔴 Primary Colors (UPDATED)
				primary: {
					DEFAULT: "#86100E", // Deep Red (New Primary)
					dark: "#5c0a09", // Darker Burgundy for Dark Mode
					foreground: "#ffffff", // White Text on Primary
					foregroundDark: "#f8d7da", // Muted Light Pinkish Red in Dark Mode, a slightly darker shade for better readability, like #e57373 (soft red) or #d32f2f (darker red).
				},

				// 🟢 Secondary Colors
				secondary: {
					DEFAULT: "#e2e8f0", // Soft Blue-Gray Background
					dark: "#1e293b", // Dark Blue for Dark Mode
					foreground: "#1e293b", // Darker Text
					foregroundDark: "#e2e8f0", // Lighter Text for Dark Mode
				},

				// 🔥 Destructive (Errors, Alerts)
				destructive: {
					DEFAULT: "#dc2626", // Bright Red (Error, Danger)
					dark: "#991b1b", // Darker Red for Dark Mode
					foreground: "#ffffff", // White Text on Red
					foregroundDark: "#fee2e2", // Lighter Red Background for Dark Mode
				},

				// 🏾 Muted (Subtle UI elements)
				muted: {
					DEFAULT: "#e5e7eb", // Soft Gray Background
					dark: "#374151", // Darker Gray in Dark Mode
					foreground: "#6b7280", // Muted Gray Text
					foregroundDark: "#cbd5e1", // Lighter Gray Text in Dark Mode
				},

				// 🌟 Accent (Highlight & Focused Elements)
				accent: {
					DEFAULT: "#e0f2fe", // Soft Blue Accent (Sky-100)
					dark: "#1A73E8", // Darker Blue for Dark Mode
					foreground: "#075985", // Dark Blue Text
					foregroundDark: "#bbdefb", // Light Blue Text for Dark Mode
					50: "#fff1f2",
					100: "#ffe4e6",
					200: "#fecdd3",
					300: "#fda4af",
					400: "#fb7185",
					500: "#f43f5e", // Reddish Pink (Accent)
					600: "#e11d48",
					700: "#be123c",
					800: "#9f1239",
					900: "#881337",
					950: "#4c0519",
				},

				// 💬 Popovers (Tooltips, Small UI elements)
				popover: {
					DEFAULT: "#ffffff", // White Background for Popovers
					dark: "#1f2937", // Dark Blue-Gray for Dark Mode
					foreground: "#1e293b", // Darker Text
					foregroundDark: "#e5e7eb", // Lighter Text in Dark Mode
				},

				// 📌 Card Backgrounds
				card: {
					DEFAULT: "#ffffff", // White Background for Cards
					dark: "#0D121D", // Darker Blue for Dark Mode
					foreground: "#1e293b", // Darker Text
					foregroundDark: "#e5e7eb", // Lighter Text in Dark Mode
				},
			},

			fontFamily: {
				sans: ["Inter var", "sans-serif"],
			},

			animation: {
				"pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
			},

			borderRadius: {
				lg: "12px",
				md: "10px",
				sm: "8px",
				xl: "16px", // For bigger cards
				full: "9999px", // For pill-shaped buttons & badges
			},
		},
	},
	plugins: [],
};
