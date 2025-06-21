import { PageNames } from "@/utils/constants";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: PageNames.Home,
			component: () => import("../views/Home/HomePage.vue"),
		},
	],
});

export default router;
