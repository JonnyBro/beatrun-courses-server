<script setup lang="ts">
import { adminDeleteRecord, adminGetRecords } from "@/api";
import type { AdminRecord } from "@/api/types";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Hint from "@/components/common/Hint.vue";
import PaginationBar from "@/components/common/PaginationBar.vue";
import UserLink from "@/components/common/UserLink.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { displayName, formatDateTime, formatRelative, formatTime, formatTimePrecise } from "@/lib/format";
import { getErrorMessage } from "@/plugins/axios";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { refDebounced } from "@vueuse/core";
import { Trash2 } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const PER_PAGE = 25;

const queryClient = useQueryClient();
const { t } = useI18n();

const courseFilter = ref("");
const playerFilter = ref("");
const course = refDebounced(courseFilter, 300);
const player = refDebounced(playerFilter, 300);
const page = ref(1);
watch([course, player], () => (page.value = 1));

const params = computed(() => ({
	course: course.value.trim() || undefined,
	player: player.value.trim() || undefined,
	page: page.value,
	limit: PER_PAGE,
}));

const records = useQuery({
	queryKey: ["admin", "records", params],
	queryFn: () => adminGetRecords(params.value),
	placeholderData: keepPreviousData,
});

const toDelete = ref<AdminRecord | null>(null);
const deleteOpen = computed({
	get: () => Boolean(toDelete.value),
	set: value => {
		if (!value) toDelete.value = null;
	},
});

const removal = useMutation({
	mutationFn: (id: string) => adminDeleteRecord(id),
	onSuccess: async () => {
		toast.success(t("admin.records.deleted"));
		toDelete.value = null;
		await queryClient.invalidateQueries({ queryKey: ["admin"] });
		await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
		await queryClient.invalidateQueries({ queryKey: ["course-records"] });
	},
	onError: error => toast.error(getErrorMessage(error)),
});
</script>

<template>
	<div class="space-y-4">
		<div class="flex flex-col gap-2 sm:flex-row">
			<Input
				v-model="courseFilter"
				:placeholder="$t('admin.records.courseFilter')"
				class="font-hud sm:max-w-56"
			/>
			<Input
				v-model="playerFilter"
				:placeholder="$t('admin.records.playerFilter')"
				class="font-hud sm:max-w-56"
			/>
		</div>

		<ErrorState v-if="records.isError.value" :error="records.error.value" @retry="records.refetch()" />
		<div v-else-if="records.isPending.value" class="space-y-2">
			<Skeleton v-for="i in 8" :key="i" class="h-10 w-full" />
		</div>
		<EmptyState v-else-if="!records.data.value?.items.length" :title="$t('admin.records.empty')" />
		<template v-else>
			<div class="hud-panel overflow-x-auto" :class="records.isPlaceholderData.value && 'opacity-60'">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{{ $t("table.player") }}</TableHead>
							<TableHead>{{ $t("table.course") }}</TableHead>
							<TableHead class="text-right">{{ $t("table.time") }}</TableHead>
							<TableHead class="hidden text-right sm:table-cell">{{ $t("table.runs") }}</TableHead>
							<TableHead class="hidden text-right md:table-cell">{{ $t("table.updated") }}</TableHead>
							<TableHead class="w-12" />
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
								<Hint :text="formatTimePrecise(record.time)">
									<span class="cursor-help">{{ formatTime(record.time) }}</span>
								</Hint>
							</TableCell>
							<TableCell class="hidden text-right font-hud text-base sm:table-cell">{{
								record.runs
							}}</TableCell>
							<TableCell class="hidden text-right text-muted-foreground md:table-cell">
								<Hint :text="formatDateTime(record.updatedAt)">
									<span class="cursor-help">{{ formatRelative(record.updatedAt) }}</span>
								</Hint>
							</TableCell>
							<TableCell>
								<Hint :text="$t('admin.records.delete')">
									<Button
										variant="ghost"
										size="icon-sm"
										class="text-destructive"
										:aria-label="$t('admin.records.delete')"
										@click="toDelete = record"
									>
										<Trash2 />
									</Button>
								</Hint>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
			<PaginationBar v-model="page" :total="records.data.value.total" :per-page="PER_PAGE" />
		</template>

		<ConfirmDialog
			v-model:open="deleteOpen"
			:title="$t('admin.records.deleteTitle')"
			:description="
				toDelete
					? $t('admin.records.deleteText', {
							time: formatTime(toDelete.time),
							player: displayName(toDelete.player),
							course: toDelete.courseName ?? toDelete.courseCode,
						})
					: undefined
			"
			:confirm-text="$t('admin.records.delete')"
			:loading="removal.isPending.value"
			@confirm="toDelete && removal.mutate(toDelete.id)"
		/>
	</div>
</template>
