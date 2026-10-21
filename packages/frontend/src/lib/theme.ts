import { useStorage } from "@vueuse/core";
import { computed, watchEffect } from "vue";

/**
 * Presets taken from the game. Keep in sync with src/assets/css/themes.css and the inline script in index.html.
 * `colors` are only used for the preview in the theme picker: background, panel, highlight
 */
export const themes = [
	{ name: "beatrun", label: "Beatrun", dark: true, colors: ["rgb(14 14 14)", "rgb(255 255 255)", "rgb(235 45 45)"] },
	{
		name: "courses-dark",
		label: "Courses Dark",
		dark: true,
		colors: ["rgb(40 40 40)", "rgb(72 72 72)", "rgb(255 60 60)"],
	},
	{
		name: "courses-light",
		label: "Courses Light",
		dark: false,
		colors: ["rgb(245 247 250)", "rgb(210 214 220)", "rgb(33 150 243)"],
	},
	{ name: "purist", label: "Purist", dark: false, colors: ["rgb(236 236 234)", "rgb(17 17 17)", "rgb(218 37 29)"] },
	{ name: "infection", label: "Infection", dark: true, colors: ["rgb(14 8 8)", "rgb(75 32 32)", "rgb(255 60 60)"] },
] as const;

export type ThemeName = (typeof themes)[number]["name"];

export const THEME_STORAGE_KEY = "br-theme";

const theme = useStorage<ThemeName>(THEME_STORAGE_KEY, "beatrun");

let applied = false;

export const useTheme = () => {
	const current = computed(() => themes.find(t => t.name === theme.value) ?? themes[0]);

	if (!applied) {
		applied = true;

		watchEffect(() => {
			const root = document.documentElement;
			root.dataset.theme = current.value.name;
			root.classList.toggle("dark", current.value.dark);
		});
	}

	return { theme, current, isDark: computed(() => current.value.dark) };
};
