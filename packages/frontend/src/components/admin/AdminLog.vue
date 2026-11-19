<script setup lang="ts">
import { adminGetLog } from "@/api";
import type { AdminLogEntry } from "@/api/types";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Hint from "@/components/common/Hint.vue";
import PaginationBar from "@/components/common/PaginationBar.vue";
import UserLink from "@/components/common/UserLink.vue";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatRelative, formatTime } from "@/lib/format";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const PER_PAGE = 50;

const { t } = useI18n();

const page = ref(1);
const params = computed(() => ({ page: page.value, limit: PER_PAGE }));

const log = useQuery({
	queryKey: ["admin", "log", params],
	queryFn: () => adminGetLog(params.value),
	placeholderData: keepPreviousData,
});

const isUserAction = (entry: AdminLogEntry) => entry.action.startsWith("user.");

const str = (value: unknown) => {
	if (typeof value === "string") return value || "-";
	if (typeof value === "number" || typeof value === "boolean") return String(value);

	return value === null || value === undefined ? "-" : JSON.stringify(value);
};

const describe = (entry: AdminLogEntry) => {
	const d = entry.details;
	const parts: string[] = [];

	switch (entry.action) {
		case "user.update":
			if (d.admin === true) parts.push(t("admin.log.details.madeAdmin"));
			if (d.admin === false) parts.push(t("admin.log.details.removedAdmin"));
			if (d.ban) parts.push(t("admin.log.details.banned", { reason: str(d.ban) }));
			if (d.unban) parts.push(t("admin.log.details.unbanned", { reason: str(d.unban) }));
			if (d.newUsername) parts.push(t("admin.log.details.renamed", { name: str(d.newUsername) }));
			break;
		case "user.delete":
			if (d.purge) parts.push(t("admin.log.details.purged"));
			break;
		case "course.update":
			for (const [field, change] of Object.entries(
				(d.changes ?? {}) as Record<string, { from: unknown; to: unknown }>,
			)) {
				parts.push(t("admin.log.details.change", { field, from: str(change.from), to: str(change.to) }));
			}
			break;
		case "course.replace":
			parts.push(t("admin.log.details.removedRecords", { n: Number(d.removedRecords) || 0 }));
			break;
		case "course.delete":
			if (d.author) parts.push(t("admin.log.details.by", { author: str(d.author) }));
			break;
		default:
			parts.push(t("admin.log.details.time", { time: formatTime(Number(d.time)), player: str(d.player) }));
			if (d.reason) parts.push(str(d.reason));
	}

	return parts.join(" | ");
};
</script>

<template>
	<div class="space-y-4">
		<p class="text-muted-foreground">{{ $t("admin.log.hint") }}</p>

		<ErrorState v-if="log.isError.value" :error="log.error.value" @retry="log.refetch()" />
		<div v-else-if="log.isPending.value" class="space-y-2">
			<Skeleton v-for="i in 8" :key="i" class="h-10 w-full" />
		</div>
		<EmptyState v-else-if="!log.data.value?.items.length" :title="$t('admin.log.empty')" />
		<template v-else>
			<div class="hud-panel overflow-x-auto" :class="log.isPlaceholderData.value && 'opacity-60'">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{{ $t("admin.log.when") }}</TableHead>
							<TableHead>{{ $t("admin.log.admin") }}</TableHead>
							<TableHead>{{ $t("admin.log.action") }}</TableHead>
							<TableHead>{{ $t("admin.log.target") }}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow v-for="entry in log.data.value.items" :key="entry.id">
							<TableCell class="whitespace-nowrap text-muted-foreground">
								<Hint :text="formatDateTime(entry.at)">
									<span class="cursor-help">{{ formatRelative(entry.at) }}</span>
								</Hint>
							</TableCell>
							<TableCell class="max-w-48"><UserLink :user="entry.admin" /></TableCell>
							<TableCell class="max-w-96">
								<span class="font-medium">{{ $t(`admin.log.actions.${entry.action}`) }}</span>
								<span class="block text-sm break-words text-muted-foreground">{{
									describe(entry)
								}}</span>
							</TableCell>
							<TableCell class="max-w-64">
								<RouterLink
									v-if="isUserAction(entry)"
									:to="{ name: 'user', params: { steamId: entry.target } }"
									class="block truncate hover:text-hl"
								>
									{{
										str(entry.details.username) === "-" ? entry.target : str(entry.details.username)
									}}
								</RouterLink>
								<RouterLink
									v-else
									:to="{ name: 'course', params: { code: entry.target } }"
									class="block truncate hover:text-hl"
								>
									{{ entry.details.name ? str(entry.details.name) : entry.target }}
								</RouterLink>
								<span class="font-hud text-sm text-muted-foreground">{{ entry.target }}</span>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
			<PaginationBar v-model="page" :total="log.data.value.total" :per-page="PER_PAGE" />
		</template>
	</div>
</template>
