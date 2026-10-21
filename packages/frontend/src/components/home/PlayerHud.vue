<script setup lang="ts">
import { getProfile, loginUrl } from "@/api";
import Hint from "@/components/common/Hint.vue";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import { displayName, formatNumber } from "@/lib/format";
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { SteamIcon } from "vue3-simple-icons";

// The HUD corner from the game: "★ LVL", nickname, XP bar and the course line under it
const props = defineProps<{ totalCourses?: number }>();

const { me } = useAuth();

const profile = useQuery({
	queryKey: computed(() => ["profile", me.value?.steamId]),
	queryFn: () => getProfile(me.value!.steamId),
	enabled: computed(() => Boolean(me.value)),
});

const stats = computed(() => profile.data.value?.stats);
const progress = computed(() => {
	if (!stats.value || !props.totalCourses) return 0;
	return Math.min(1, stats.value.completed / props.totalCourses);
});
</script>

<template>
	<div class="hud-panel hud-edge flex min-w-72 flex-col gap-1.5 px-4 py-3">
		<template v-if="me">
			<Hint :text="$t('profile.tips.rank')" side="top">
				<p class="w-fit cursor-help font-hud text-2xl leading-none uppercase">
					★ {{ stats?.rank ? $t("hud.rank", { rank: stats.rank }) : $t("hud.unranked") }}
				</p>
			</Hint>
			<p class="font-hud text-base">
				<RouterLink :to="{ name: 'user', params: { steamId: me.steamId } }" class="hover:text-hl">
					{{ displayName(me) }}
				</RouterLink>
				| {{ $t("common.points", { n: formatNumber(stats?.points ?? 0) }) }}
			</p>
			<Hint :text="$t('profile.tips.progress', { percent: Math.round(progress * 100) })">
				<div class="hud-bar w-48 cursor-help"><span :style="{ width: `${progress * 100}%` }" /></div>
			</Hint>
			<p class="font-hud text-base text-muted-foreground">
				{{ $t("hud.completed", { done: stats?.completed ?? 0, total: totalCourses ?? "?" }) }}
			</p>
			<div class="mt-2 flex gap-2">
				<Button as-child variant="outline" size="sm">
					<RouterLink :to="{ name: 'user', params: { steamId: me.steamId }, hash: '#key' }">{{
						$t("hud.gameKey")
					}}</RouterLink>
				</Button>
				<Button as-child variant="ghost" size="sm">
					<RouterLink :to="{ name: 'user', params: { steamId: me.steamId } }">{{
						$t("hud.profile")
					}}</RouterLink>
				</Button>
			</div>
		</template>

		<template v-else>
			<p class="font-hud text-2xl leading-none uppercase">★ {{ $t("hud.freeplay") }}</p>
			<p class="font-hud text-base text-muted-foreground">{{ $t("hud.notSignedIn") }}</p>
			<div class="hud-bar w-48"><span style="width: 0" /></div>
			<p class="max-w-72 text-muted-foreground">{{ $t("hud.signInHint") }}</p>
			<div class="mt-2">
				<Button as="a" :href="loginUrl('/profile')" size="sm">
					<SteamIcon class="size-4" />
					{{ $t("common.signIn") }}
				</Button>
			</div>
		</template>
	</div>
</template>
