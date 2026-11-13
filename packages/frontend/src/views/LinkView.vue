<script setup lang="ts">
import { confirmLink, getLink, loginUrl } from "@/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import { getErrorMessage } from "@/plugins/axios";
import { useMutation, useQuery } from "@tanstack/vue-query";
import { AxiosError } from "axios";
import { CircleCheck, TriangleAlert } from "lucide-vue-next";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { SteamIcon } from "vue3-simple-icons";

const route = useRoute();
const { me, isLoading } = useAuth();

const code = computed(() => (typeof route.query.code === "string" ? route.query.code : ""));

const link = useQuery({
	queryKey: ["link", code],
	queryFn: () => getLink(code.value),
	enabled: computed(() => Boolean(me.value && code.value)),
	retry: false,
});

const confirm = useMutation({ mutationFn: () => confirmLink(code.value) });

const expired = computed(() => {
	const error = link.error.value ?? confirm.error.value;
	return !code.value || (error instanceof AxiosError && error.response?.status === 404);
});
const done = computed(() => confirm.isSuccess.value || link.data.value?.confirmed);
</script>

<template>
	<div class="flex justify-center py-10">
		<div class="hud-panel hud-edge w-full max-w-md space-y-4 px-6 py-6">
			<h1 class="font-hud text-2xl uppercase">★ {{ $t("link.title") }}</h1>

			<p v-if="isLoading" class="font-hud text-lg text-muted-foreground uppercase">{{ $t("common.loading") }}</p>

			<template v-else-if="!me">
				<p class="text-muted-foreground">{{ $t("link.signIn") }}</p>
				<Button as="a" :href="loginUrl(route.fullPath)" size="lg" class="w-full">
					<SteamIcon class="size-4" />
					{{ $t("common.signInSteam") }}
				</Button>
			</template>

			<p v-else-if="expired" class="text-muted-foreground">{{ $t("link.expired") }}</p>

			<div v-else-if="done" class="flex items-start gap-3">
				<CircleCheck class="mt-0.5 size-5 shrink-0 text-primary" />
				<p>{{ $t("link.done") }}</p>
			</div>

			<p v-else-if="link.isPending.value" class="font-hud text-lg text-muted-foreground uppercase">
				{{ $t("common.loading") }}
			</p>

			<template v-else-if="link.data.value">
				<p class="text-muted-foreground">{{ $t("link.text") }}</p>
				<p class="text-center font-hud text-4xl tracking-widest">{{ link.data.value.code }}</p>
				<div class="flex items-start gap-3 rounded-md border border-destructive/50 px-3 py-2 text-sm">
					<TriangleAlert class="mt-0.5 size-4 shrink-0 text-destructive" />
					<p>{{ $t("link.warning") }}</p>
				</div>
				<p v-if="confirm.isError.value" class="text-sm text-destructive">
					{{ getErrorMessage(confirm.error.value) }}
				</p>
				<Button size="lg" class="w-full" :disabled="confirm.isPending.value" @click="confirm.mutate()">
					{{ $t("link.confirm") }}
				</Button>
			</template>

			<p v-else-if="link.isError.value" class="text-sm text-destructive">
				{{ getErrorMessage(link.error.value) }}
			</p>
		</div>
	</div>
</template>
