<script setup lang="ts">
import { regenerateKey } from "@/api";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import HudIcon from "@/components/icons/HudIcon.vue";
import { Button } from "@/components/ui/button";
import { useRefreshAuth } from "@/composables/useAuth";
import { useCopy } from "@/composables/useCopy";
import { getErrorMessage } from "@/plugins/axios";
import { useMutation } from "@tanstack/vue-query";
import { Eye, EyeOff, KeyRound, RefreshCw } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const props = defineProps<{ hasKey: boolean }>();

const { copy } = useCopy();
const { t } = useI18n();
const refreshAuth = useRefreshAuth();

const revealed = ref(true);
const confirmOpen = ref(false);
// The server only keeps a hash, so the key exists in the page only right after it was generated
const freshKey = ref<string | null>(null);

const shown = computed(() => {
	if (freshKey.value) return revealed.value ? freshKey.value : "•".repeat(freshKey.value.length);

	return props.hasKey ? "•".repeat(32) : "—";
});

const regenerate = useMutation({
	mutationFn: regenerateKey,
	onSuccess: async data => {
		confirmOpen.value = false;
		freshKey.value = data.key;
		revealed.value = true;
		await refreshAuth();
		toast.success(t("key.generated"));
	},
	onError: error => toast.error(getErrorMessage(error)),
});

const onNewKey = () => {
	if (props.hasKey) confirmOpen.value = true;
	else regenerate.mutate();
};
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
				class="flex h-9 min-w-0 flex-1 items-center overflow-x-auto rounded-md border bg-background px-3 font-hud text-base whitespace-nowrap"
				:class="{ 'select-all': freshKey && revealed }"
			>
				{{ shown }}
			</code>
			<div class="flex gap-2">
				<template v-if="freshKey">
					<Button
						variant="outline"
						size="icon"
						:aria-label="revealed ? $t('key.hide') : $t('key.show')"
						@click="revealed = !revealed"
					>
						<EyeOff v-if="revealed" />
						<Eye v-else />
					</Button>
					<Button @click="freshKey && copy(freshKey, $t('key.copied'))">
						<HudIcon name="copy" />
						{{ $t("key.copy") }}
					</Button>
				</template>
				<Button
					:variant="hasKey || freshKey ? 'outline' : 'default'"
					:disabled="regenerate.isPending.value"
					@click="onNewKey"
				>
					<RefreshCw v-if="hasKey" />
					<KeyRound v-else />
					{{ hasKey ? $t("key.new") : $t("key.create") }}
				</Button>
			</div>
		</div>

		<p class="text-sm" :class="freshKey ? 'text-primary' : 'text-muted-foreground'">
			{{ freshKey ? $t("key.once") : hasKey ? $t("key.hidden") : $t("key.none") }}
		</p>

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
