import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import "./assets/css/index.css";
import { VueQueryPlugin } from "@tanstack/vue-query";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, {
	queryClientConfig: {
		defaultOptions: {
			queries: {
				refetchOnMount: false,
				refetchOnWindowFocus: false,
			},
		},
	},
	enableDevtoolsV6Plugin: true,
});

app.mount("#app");
