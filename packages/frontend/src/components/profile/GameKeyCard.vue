<script setup lang="ts">
import { regenerateKey } from "@/api";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import HudIcon from "@/components/icons/HudIcon.vue";
import { Button } from "@/components/ui/button";
import { useRefreshAuth } from "@/composables/useAuth";
import { useCopy } from "@/composables/useCopy";
import { getErrorMessage } from "@/plugins/axios";
import { useMutation } from "@tanstack/vue-query";
import { Eye, EyeOff, RefreshCw } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const props = defineProps<{ gameKey: string | null }>();

const { copy } = useCopy();
const { t } = useI18n();
const refreshAuth = useRefreshAuth();

const revealed = ref(false);
const confirmOpen = ref(false);

const masked = computed(() => (props.gameKey ? "•".repeat(props.gameKey.length) : "—"));

const regenerate = useMutation({
	mutationFn: regenerateKey,
	onSuccess: async () => {
		confirmOpen.value = false;
		revealed.value = true;
		await refreshAuth();
		toast.success(t("key.generated"));
	},
	onError: error => toast.error(getErrorMessage(error)),
});
</script>

<template>
	<section id="key" class="hud-panel hud-edge scroll-mt-20 space-y-3 px-4 py-4">
		<div class="space-y-1">
			<h2 class="font-hud text-xl uppercase">{{ $t("key.title") }}</h2>
			<i18n-t keypath="key.text" tag="p" class="text-muted-foreground">
				<template #key><kbd>F4</kbd></template>
			</i18n-t>
		</div>

		<div class="flex flex-col gap-2 sm:flex-row">
			<code
				class="flex h-9 min-w-0 flex-1 items-center overflow-x-auto rounded-md border bg-background px-3 font-hud text-base whitespace-nowrap select-all"
			>
				{{ revealed ? (gameKey ?? "—") : masked }}
			</code>
			<div class="flex gap-2">
				<Button
					variant="outline"
					size="icon"
					:aria-label="revealed ? $t('key.hide') : $t('key.show')"
					@click="revealed = !revealed"
				>
					<EyeOff v-if="revealed" />
					<Eye v-else />
				</Button>
				<Button :disabled="!gameKey" @click="gameKey && copy(gameKey, $t('key.copied'))">
					<HudIcon name="copy" />
					{{ $t("key.copy") }}
				</Button>
				<Button variant="outline" @click="confirmOpen = true">
					<RefreshCw />
					{{ $t("key.new") }}
				</Button>
			</div>
		</div>

		<ConfirmDialog
			v-model:open="confirmOpen"
			:title="$t('key.confirmTitle')"
			:description="$t('key.confirmText')"
			:confirm-text="$t('key.confirm')"
			:loading="regenerate.isPending.value"
			@confirm="regenerate.mutate()"
		/>
	</section>
</template>
