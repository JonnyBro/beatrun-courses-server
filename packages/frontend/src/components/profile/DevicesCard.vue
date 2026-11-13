<script setup lang="ts">
import { getDevices, removeDevice, renameDevice } from "@/api";
import type { Device } from "@/api/types";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import Hint from "@/components/common/Hint.vue";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ME_QUERY_KEY } from "@/composables/useAuth";
import { formatDateTime, formatRelative } from "@/lib/format";
import { getErrorMessage } from "@/plugins/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Gamepad2, KeyRound, LoaderCircle, Pencil, Unplug } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const OS_NAMES = { windows: "Windows", linux: "Linux", osx: "macOS" } as const;

const { t, locale } = useI18n();
const client = useQueryClient();

const devices = useQuery({ queryKey: ["devices"], queryFn: getDevices });

const regions = computed(() => new Intl.DisplayNames([locale.value], { type: "region" }));
const countryName = (code: string) => regions.value.of(code) ?? code;
const hasCountries = computed(() => devices.data.value?.some(d => d.signInCountry || d.lastCountry));

/** "unknown" is the main branch of the game, it isn't worth showing */
const defaultName = (device: Device) => {
	if (device.kind === "legacy") return t("devices.kinds.legacy");
	if (!device.system) return t("devices.kinds.game");

	const { os, branch } = device.system;

	return branch === "unknown" ? OS_NAMES[os] : `${OS_NAMES[os]} · ${branch}`;
};

const shownIps = ref(new Set<string>());
const toggleIp = (id: string) => {
	const next = new Set(shownIps.value);
	if (!next.delete(id)) next.add(id);
	shownIps.value = next;
};

const refresh = () =>
	Promise.all([
		client.invalidateQueries({ queryKey: ["devices"] }),
		client.invalidateQueries({ queryKey: ME_QUERY_KEY }),
	]);

const removing = ref<Device | null>(null);

const remove = useMutation({
	mutationFn: (device: Device) => removeDevice(device.id),
	onSuccess: async () => {
		removing.value = null;
		await refresh();
		toast.success(t("devices.removed"));
	},
	onError: error => toast.error(getErrorMessage(error)),
});

const renaming = ref<Device | null>(null);
const newName = ref("");
const renameOpen = computed({
	get: () => Boolean(renaming.value),
	set: value => {
		if (!value) renaming.value = null;
	},
});

const startRename = (device: Device) => {
	renaming.value = device;
	newName.value = device.name ?? "";
};

const rename = useMutation({
	mutationFn: (device: Device) => renameDevice(device.id, newName.value.trim() || null),
	onSuccess: async () => {
		renaming.value = null;
		await refresh();
	},
	onError: error => toast.error(getErrorMessage(error)),
});
</script>

<template>
	<section id="devices" class="hud-panel hud-edge scroll-mt-20 space-y-3 px-4 py-4">
		<div class="space-y-1">
			<h2 class="font-hud text-xl uppercase">{{ $t("devices.title") }}</h2>
			<i18n-t keypath="devices.text" tag="p" class="text-muted-foreground">
				<template #key><kbd>F4</kbd></template>
			</i18n-t>
		</div>

		<div v-if="devices.isPending.value" class="space-y-2">
			<Skeleton v-for="i in 2" :key="i" class="h-12 w-full" />
		</div>

		<p v-else-if="devices.isError.value" class="text-sm text-destructive">
			{{ getErrorMessage(devices.error.value) }}
		</p>

		<p v-else-if="!devices.data.value?.length" class="text-sm text-muted-foreground">
			{{ $t("devices.none") }}
		</p>

		<ul v-else class="divide-y rounded-md border">
			<li v-for="device in devices.data.value" :key="device.id" class="flex items-start gap-3 px-3 py-2">
				<KeyRound v-if="device.kind === 'legacy'" class="mt-0.5 size-5 shrink-0 text-destructive" />
				<Gamepad2 v-else class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
				<div class="min-w-0 flex-1 space-y-0.5">
					<p class="flex items-center gap-1 font-semibold">
						<span class="truncate">{{ device.name ?? defaultName(device) }}</span>
						<Button
							variant="ghost"
							size="icon"
							class="size-6 shrink-0"
							:aria-label="$t('devices.rename')"
							@click="startRename(device)"
						>
							<Pencil class="size-3.5" />
						</Button>
					</p>
					<p v-if="device.name" class="text-sm text-muted-foreground">{{ defaultName(device) }}</p>
					<p v-if="device.kind === 'legacy'" class="text-sm text-destructive">
						{{ $t("devices.legacyHint") }}
					</p>
					<p class="text-sm text-muted-foreground">
						<template v-if="device.signInCountry">
							{{ $t("devices.country", { country: countryName(device.signInCountry) }) }} ·
						</template>
						<Hint :text="formatDateTime(device.lastUsedAt)">
							<span class="cursor-help">
								{{ $t("devices.lastUsed", { when: formatRelative(device.lastUsedAt) }) }}
							</span>
						</Hint>
						·
						<Hint :text="formatDateTime(device.createdAt)">
							<span class="cursor-help">
								{{ $t("devices.added", { when: formatRelative(device.createdAt) }) }}
							</span>
						</Hint>
					</p>
					<template v-if="device.signInIp || device.lastIp">
						<button
							type="button"
							class="text-sm text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
							@click="toggleIp(device.id)"
						>
							{{ shownIps.has(device.id) ? $t("devices.hideIp") : $t("devices.showIp") }}
						</button>
						<dl v-if="shownIps.has(device.id)" class="grid grid-cols-[auto_1fr] gap-x-3 font-hud text-sm">
							<template v-if="device.signInIp">
								<dt class="text-muted-foreground">{{ $t("devices.signInIp") }}</dt>
								<dd>
									{{ device.signInIp }}
									<span v-if="device.signInCountry" class="text-muted-foreground">
										{{ countryName(device.signInCountry) }}
									</span>
								</dd>
							</template>
							<template v-if="device.lastIp">
								<dt class="text-muted-foreground">{{ $t("devices.lastIp") }}</dt>
								<dd>
									{{ device.lastIp }}
									<span v-if="device.lastCountry" class="text-muted-foreground">
										{{ countryName(device.lastCountry) }}
									</span>
								</dd>
							</template>
						</dl>
					</template>
				</div>
				<Button variant="outline" size="sm" @click="removing = device">
					<Unplug />
					{{ $t("devices.remove") }}
				</Button>
			</li>
		</ul>

		<p class="text-sm text-muted-foreground">{{ $t("devices.expiry") }}</p>
		<!-- DB-IP Lite is CC BY 4.0, the credit has to be next to the data -->
		<p v-if="hasCountries" class="text-xs text-muted-foreground">
			<a href="https://db-ip.com" target="_blank" rel="noopener" class="underline">IP Geolocation by DB-IP</a>
		</p>

		<ConfirmDialog
			:open="Boolean(removing)"
			:title="$t('devices.confirmTitle')"
			:description="$t('devices.confirmText')"
			:confirm-text="$t('devices.remove')"
			:loading="remove.isPending.value"
			@update:open="open => !open && (removing = null)"
			@confirm="removing && remove.mutate(removing)"
		/>

		<Dialog v-model:open="renameOpen">
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{{ $t("devices.rename") }}</DialogTitle>
					<DialogDescription>{{ $t("devices.renameText") }}</DialogDescription>
				</DialogHeader>
				<form id="rename-device" @submit.prevent="renaming && rename.mutate(renaming)">
					<Input
						v-model="newName"
						maxlength="64"
						:placeholder="renaming ? defaultName(renaming) : ''"
						:aria-label="$t('devices.rename')"
					/>
				</form>
				<DialogFooter>
					<Button variant="outline" @click="renaming = null">{{ $t("common.cancel") }}</Button>
					<Button type="submit" form="rename-device" :disabled="rename.isPending.value">
						<LoaderCircle v-if="rename.isPending.value" class="animate-spin" />
						{{ $t("common.save") }}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</section>
</template>
