<script setup lang="ts">
import { loginUrl } from "@/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import { watchEffect } from "vue";
import { useRouter } from "vue-router";
import { SteamIcon } from "vue3-simple-icons";

const { me, isLoading } = useAuth();
const router = useRouter();

watchEffect(() => {
	if (me.value) void router.replace({ name: "user", params: { steamId: me.value.steamId }, hash: "#key" });
});
</script>

<template>
	<div class="flex justify-center py-10">
		<p v-if="isLoading || me" class="font-hud text-lg text-muted-foreground uppercase">
			{{ $t("common.loading") }}
		</p>

		<div v-else class="hud-panel hud-edge w-full max-w-md space-y-4 px-6 py-6">
			<h1 class="font-hud text-2xl uppercase">★ {{ $t("signIn.title") }}</h1>
			<p class="text-muted-foreground">{{ $t("signIn.text") }}</p>
			<Button as="a" :href="loginUrl('/profile')" size="lg" class="w-full">
				<SteamIcon class="size-4" />
				{{ $t("common.signInSteam") }}
			</Button>
		</div>
	</div>
</template>
