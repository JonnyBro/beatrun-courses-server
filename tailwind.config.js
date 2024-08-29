/** @type {import('tailwindcss').Config} */

module.exports = {
	content: [
		"./views/*.ejs",
		"./components/*.html",
	],
	plugins: [require("daisyui")],
	daisyui: {
		themes: ["nord", "black"],
		darkTheme: "black",
	},
};
