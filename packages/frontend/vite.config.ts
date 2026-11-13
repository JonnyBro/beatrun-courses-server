import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

const root = fileURLToPath(new URL("../..", import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, root, "");
	const backend = `http://localhost:${env.PORT || 6547}`;

	return {
		plugins: [vue(), vueDevTools(), tailwindcss()],
		// vue-i18n feature flags, only the Composition API is used
		define: {
			__VUE_I18N_FULL_INSTALL__: true,
			__VUE_I18N_LEGACY_API__: false,
			__INTLIFY_PROD_DEVTOOLS__: false,
		},
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
			},
		},
		server: {
			// Set DOMAIN in .env to http://localhost:5173 so Steam login comes back through this proxy
			proxy: {
				"/api": { target: backend },
				"/auth": { target: backend },
			},
		},
	};
});
