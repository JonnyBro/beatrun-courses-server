import { getMe } from "@/api";
import { ME_QUERY_KEY } from "@/composables/useAuth";
import { i18n } from "@/i18n";
import { queryClient } from "@/plugins/query";
import { watch } from "vue";
import { createRouter, createWebHistory } from "vue-router";

declare module "vue-router" {
	interface RouteMeta {
		/** i18n key of the page title */
		title?: string;
		requiresAdmin?: boolean;
		section?: string;
	}
}

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	scrollBehavior: (to, from, saved) => {
		if (saved) return saved;
		if (to.hash) return { el: to.hash, behavior: "smooth", top: 80 };
		// Changing filters/pages shouldn't jump to the top
		if (to.path === from.path) return false;
		return { top: 0 };
	},
	routes: [
		{
			path: "/",
			name: "home",
			component: () => import("@/views/HomeView.vue"),
		},
		{
			path: "/course/:code",
			name: "course",
			component: () => import("@/views/CourseView.vue"),
			meta: { section: "home" },
		},
		{
			path: "/leaderboard",
			name: "leaderboard",
			component: () => import("@/views/LeaderboardView.vue"),
			meta: { title: "header.leaderboard" },
		},
		{
			path: "/user/:steamId",
			name: "user",
			component: () => import("@/views/ProfileView.vue"),
		},
		{
			// Short link used by the game and the old site
			path: "/profile",
			name: "me",
			component: () => import("@/views/MeView.vue"),
			meta: { title: "userMenu.profile" },
		},
		{
			path: "/admin",
			name: "admin",
			component: () => import("@/views/AdminView.vue"),
			meta: { title: "header.admin", requiresAdmin: true },
		},
		{
			path: "/:pathMatch(.*)*",
			name: "not-found",
			component: () => import("@/views/NotFoundView.vue"),
			meta: { title: "notFound.text" },
		},
	],
});

router.beforeEach(async to => {
	if (!to.meta.requiresAdmin) return;

	const me = await queryClient
		.fetchQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe, staleTime: 60_000 })
		.catch(() => null);
	if (!me?.admin) return { name: "not-found", params: { pathMatch: to.path.slice(1).split("/") } };
});

const updateTitle = () => {
	const title = router.currentRoute.value.meta.title;
	document.title = title ? `${i18n.global.t(title)} · Beatrun Courses` : "Beatrun Courses";
};

router.afterEach(updateTitle);
watch(i18n.global.locale, updateTitle);

export default router;
