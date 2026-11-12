<script setup lang="ts">
import { adminApprovePendingRecord, adminGetPendingRecords, adminRejectPendingRecord } from "@/api";
import type { PendingRecord } from "@/api/types";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Hint from "@/components/common/Hint.vue";
import PaginationBar from "@/components/common/PaginationBar.vue";
import UserLink from "@/components/common/UserLink.vue";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { displayName, formatDateTime, formatRelative, formatTime, formatTimePrecise } from "@/lib/format";
import { getErrorMessage } from "@/plugins/axios";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Check, X } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const PER_PAGE = 25;

const queryClient = useQueryClient();
const { t } = useI18n();

const page = ref(1);
const params = computed(() => ({ page: page.value, limit: PER_PAGE }));

const records = useQuery({
	queryKey: ["admin", "pending-records", params],
	queryFn: () => adminGetPendingRecords(params.value),
	placeholderData: keepPreviousData,
});

const refresh = async () => {
	await queryClient.invalidateQueries({ queryKey: ["admin"] });
	await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
	await queryClient.invalidateQueries({ queryKey: ["course-records"] });
};

const approval = useMutation({
	mutationFn: (id: string) => adminApprovePendingRecord(id),
	onSuccess: async () => {
		toast.success(t("admin.pending.approved"));
		await refresh();
	},
	onError: error => toast.error(getErrorMessage(error)),
});

const toReject = ref<PendingRecord | null>(null);
const rejectOpen = computed({
	get: () => Boolean(toReject.value),
	set: value => {
		if (!value) toReject.value = null;
	},
});

const rejection = useMutation({
	mutationFn: (id: string) => adminRejectPendingRecord(id),
	onSuccess: async () => {
		toast.success(t("admin.pending.rejected"));
		toReject.value = null;
		await refresh();
	},
	onError: error => toast.error(getErrorMessage(error)),
});

const splitsText = (record: PendingRecord) =>
	record.splits.map((split, i) => `${i + 1}: ${formatTimePrecise(split)}`).join(", ");
</script>

<template>
	<div class="space-y-4">
		<p class="text-muted-foreground">{{ $t("admin.pending.hint") }}</p>

		<ErrorState v-if="records.isError.value" :error="records.error.value" @retry="records.refetch()" />
		<div v-else-if="records.isPending.value" class="space-y-2">
			<Skeleton v-for="i in 8" :key="i" class="h-10 w-full" />
		</div>
		<EmptyState v-else-if="!records.data.value?.items.length" :title="$t('admin.pending.empty')" />
		<template v-else>
			<div class="hud-panel overflow-x-auto" :class="records.isPlaceholderData.value && 'opacity-60'">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{{ $t("table.player") }}</TableHead>
							<TableHead>{{ $t("table.course") }}</TableHead>
							<TableHead class="text-right">{{ $t("table.time") }}</TableHead>
							<TableHead class="hidden lg:table-cell">{{ $t("admin.pending.reason") }}</TableHead>
							<TableHead class="hidden text-right md:table-cell">{{ $t("table.updated") }}</TableHead>
							<TableHead class="w-24" />
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow v-for="record in records.data.value.items" :key="record.id">
							<TableCell class="max-w-48"><UserLink :user="record.player" /></TableCell>
							<TableCell class="max-w-64">
								<RouterLink
									:to="{ name: 'course', params: { code: record.courseCode } }"
									class="block truncate font-medium hover:text-hl"
								>
									{{ record.courseName ?? $t("admin.records.deletedCourse") }}
								</RouterLink>
								<span class="font-hud text-sm text-muted-foreground">{{ record.courseCode }}</span>
							</TableCell>
							<TableCell class="text-right font-hud text-base">
								<Hint :text="splitsText(record)">
									<span class="cursor-help">{{ formatTime(record.time) }}</span>
								</Hint>
							</TableCell>
							<TableCell class="hidden max-w-80 text-sm text-muted-foreground lg:table-cell">
								{{ record.reason }}
							</TableCell>
							<TableCell class="hidden text-right text-muted-foreground md:table-cell">
								<Hint :text="formatDateTime(record.createdAt)">
									<span class="cursor-help">{{ formatRelative(record.createdAt) }}</span>
								</Hint>
							</TableCell>
							<TableCell>
								<div class="flex justify-end gap-1">
									<Hint :text="$t('admin.pending.approve')">
										<Button
											variant="ghost"
											size="icon-sm"
											:aria-label="$t('admin.pending.approve')"
											:disabled="approval.isPending.value"
											@click="approval.mutate(record.id)"
										>
											<Check />
										</Button>
									</Hint>
									<Hint :text="$t('admin.pending.reject')">
										<Button
											variant="ghost"
											size="icon-sm"
											class="text-destructive"
											:aria-label="$t('admin.pending.reject')"
											@click="toReject = record"
										>
											<X />
										</Button>
									</Hint>
								</div>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
			<PaginationBar v-model="page" :total="records.data.value.total" :per-page="PER_PAGE" />
		</template>

		<ConfirmDialog
			v-model:open="rejectOpen"
			:title="$t('admin.pending.rejectTitle')"
			:description="
				toReject
					? $t('admin.pending.rejectText', {
							time: formatTime(toReject.time),
							player: displayName(toReject.player),
							course: toReject.courseName ?? toReject.courseCode,
						})
					: undefined
			"
			:confirm-text="$t('admin.pending.reject')"
			:loading="rejection.isPending.value"
			@confirm="toReject && rejection.mutate(toReject.id)"
		/>
	</div>
</template>
