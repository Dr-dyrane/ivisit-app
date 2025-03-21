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
				primary: "#86100E",
				primaryDark: "#ECA6A4",
				secondary: "#ffa9a8",
				snowPink: "FCF5F5",
				accent: "#00dfc0",
				pink: "#d268cc",
				backgroundLight: "#F9F9F9",
				backgroundDark: "#2C2C2C",
				textLight: "#FFFFFF",
				textDark: "#333333",
				placeholder: "#B0B0B0",
			},
		},
	},
	plugins: [],
};
