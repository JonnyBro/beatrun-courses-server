<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import { KeyRound } from "lucide-vue-next";
import { useRoute } from "vue-router";

const { me } = useAuth();
const route = useRoute();
</script>

<template>
	<div
		v-if="me?.legacyKey && route.name !== 'link'"
		class="mb-6 space-y-2 border-2 border-destructive bg-destructive/10 p-4"
	>
		<p class="flex items-center gap-2 font-hud text-xl text-destructive uppercase">
			<KeyRound class="size-5 shrink-0" />
			{{ $t("legacyKey.title") }}
		</p>
		<i18n-t keypath="legacyKey.text" tag="p">
			<template #key><kbd>F4</kbd></template>
		</i18n-t>
		<Button as-child variant="outline" size="sm">
			<RouterLink :to="{ name: 'user', params: { steamId: me.steamId }, hash: '#devices' }">
				{{ $t("legacyKey.action") }}
			</RouterLink>
		</Button>
	</div>
</template>
