<script setup lang="ts">
import { adminUpdateCourse, deleteCourse, searchCourses } from "@/api";
import type { Course } from "@/api/types";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Hint from "@/components/common/Hint.vue";
import PaginationBar from "@/components/common/PaginationBar.vue";
import UserLink from "@/components/common/UserLink.vue";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { getErrorMessage } from "@/plugins/axios";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { refDebounced } from "@vueuse/core";
import { Ellipsis, ExternalLink, LoaderCircle, Pencil, Search, Trash2 } from "lucide-vue-next";
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const PER_PAGE = 25;

const queryClient = useQueryClient();
const { t } = useI18n();

const search = ref("");
const q = refDebounced(search, 300);
const page = ref(1);
watch(q, () => (page.value = 1));

const params = computed(() => ({
	q: q.value.trim() || undefined,
	page: page.value,
	limit: PER_PAGE,
	sort: "newest" as const,
}));
const courses = useQuery({
	queryKey: ["courses", "admin", params],
	queryFn: () => searchCourses(params.value),
	placeholderData: keepPreviousData,
});

const invalidate = async (code: string) => {
	await queryClient.invalidateQueries({ queryKey: ["courses"] });
	await queryClient.invalidateQueries({ queryKey: ["course", code] });
	await queryClient.invalidateQueries({ queryKey: ["maps"] });
};

// Editing
const editing = ref<Course | null>(null);
const form = reactive({ name: "", mapName: "", workshopId: "" });
const editOpen = computed({
	get: () => Boolean(editing.value),
	set: value => {
		if (!value) editing.value = null;
	},
});

const startEdit = (course: Course) => {
	editing.value = course;
	form.name = course.name;
	form.mapName = course.mapName;
	form.workshopId = course.workshopId ?? "";
};

const update = useMutation({
	mutationFn: (code: string) =>
		adminUpdateCourse(code, {
			name: form.name.trim(),
			mapName: form.mapName.trim(),
			workshopId: form.workshopId.trim() || null,
		}),
	onSuccess: async (_data, code) => {
		toast.success(t("admin.courses.updated"));
		editing.value = null;
		await invalidate(code);
	},
	onError: error => toast.error(getErrorMessage(error)),
});

const workshopIdValid = computed(() => /^\d*$/.test(form.workshopId.trim()));
const formValid = computed(
	() => form.name.trim().length > 0 && form.mapName.trim().length > 0 && workshopIdValid.value,
);

// Deleting
const toDelete = ref<Course | null>(null);
const deleteOpen = computed({
	get: () => Boolean(toDelete.value),
	set: value => {
		if (!value) toDelete.value = null;
	},
});

const removal = useMutation({
	mutationFn: (code: string) => deleteCourse(code),
	onSuccess: async (_data, code) => {
		toast.success(t("admin.courses.deleted"));
		toDelete.value = null;
		await invalidate(code);
	},
	onError: error => toast.error(getErrorMessage(error)),
});
</script>

<template>
	<div class="space-y-4">
		<div class="relative max-w-sm">
			<Search class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input v-model="search" :placeholder="$t('admin.courses.search')" class="pl-8" />
		</div>

		<ErrorState v-if="courses.isError.value" :error="courses.error.value" @retry="courses.refetch()" />
		<div v-else-if="courses.isPending.value" class="space-y-2">
			<Skeleton v-for="i in 8" :key="i" class="h-10 w-full" />
		</div>
		<EmptyState v-else-if="!courses.data.value?.items.length" :title="$t('admin.courses.empty')" />
		<template v-else>
			<div class="hud-panel overflow-x-auto" :class="courses.isPlaceholderData.value && 'opacity-60'">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{{ $t("table.course") }}</TableHead>
							<TableHead class="hidden md:table-cell">{{ $t("table.map") }}</TableHead>
							<TableHead class="hidden lg:table-cell">{{ $t("table.author") }}</TableHead>
							<TableHead class="text-right">{{ $t("table.downloads") }}</TableHead>
							<TableHead class="hidden text-right sm:table-cell">{{ $t("table.runs") }}</TableHead>
							<TableHead class="hidden text-right sm:table-cell">{{ $t("table.uploaded") }}</TableHead>
							<TableHead class="w-12" />
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow v-for="course in courses.data.value.items" :key="course.code">
							<TableCell class="max-w-64">
								<RouterLink
									:to="{ name: 'course', params: { code: course.code } }"
									class="block truncate font-medium hover:text-hl"
								>
									{{ course.name }}
								</RouterLink>
								<span class="font-hud text-sm text-muted-foreground">{{ course.code }}</span>
							</TableCell>
							<TableCell class="hidden max-w-48 truncate font-hud text-sm md:table-cell">{{
								course.mapName
							}}</TableCell>
							<TableCell class="hidden max-w-48 lg:table-cell"
								><UserLink :user="course.author"
							/></TableCell>
							<TableCell class="text-right font-hud text-base">{{
								formatNumber(course.downloadCount)
							}}</TableCell>
							<TableCell class="hidden text-right font-hud text-base sm:table-cell">{{
								formatNumber(course.runsCount)
							}}</TableCell>
							<TableCell class="hidden text-right text-muted-foreground sm:table-cell">
								<Hint :text="formatDateTime(course.uploadedAt)">
									<span class="cursor-help">{{ formatDate(course.uploadedAt) }}</span>
								</Hint>
							</TableCell>
							<TableCell>
								<DropdownMenu>
									<Hint :text="$t('common.actions')">
										<DropdownMenuTrigger as-child>
											<Button variant="ghost" size="icon-sm" :aria-label="$t('common.actions')"
												><Ellipsis
											/></Button>
										</DropdownMenuTrigger>
									</Hint>
									<DropdownMenuContent align="end">
										<DropdownMenuItem as-child>
											<RouterLink :to="{ name: 'course', params: { code: course.code } }">
												<ExternalLink />
												{{ $t("common.open") }}
											</RouterLink>
										</DropdownMenuItem>
										<DropdownMenuItem @select="startEdit(course)">
											<Pencil />
											{{ $t("common.edit") }}
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem variant="destructive" @select="toDelete = course">
											<Trash2 />
											{{ $t("common.delete") }}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
			<PaginationBar v-model="page" :total="courses.data.value.total" :per-page="PER_PAGE" />
		</template>

		<Dialog v-model:open="editOpen">
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{{ $t("admin.courses.editTitle") }}</DialogTitle>
					<DialogDescription>
						{{ $t("admin.courses.editText", { code: editing?.code ?? "" }) }}
					</DialogDescription>
				</DialogHeader>
				<form
					id="edit-course"
					class="space-y-4"
					@submit.prevent="editing && formValid && update.mutate(editing.code)"
				>
					<div class="space-y-2">
						<Label for="course-name">{{ $t("admin.courses.name") }}</Label>
						<Input id="course-name" v-model="form.name" maxlength="128" />
					</div>
					<div class="space-y-2">
						<Label for="course-map">{{ $t("admin.courses.map") }}</Label>
						<Input id="course-map" v-model="form.mapName" class="font-hud" maxlength="128" />
					</div>
					<div class="space-y-2">
						<Label for="course-workshop">{{ $t("admin.courses.workshopId") }}</Label>
						<Input
							id="course-workshop"
							v-model="form.workshopId"
							class="font-hud"
							inputmode="numeric"
							:placeholder="$t('admin.courses.workshopPlaceholder')"
						/>
						<p v-if="!workshopIdValid" class="text-xs text-destructive">
							{{ $t("admin.courses.digitsOnly") }}
						</p>
					</div>
				</form>
				<DialogFooter>
					<Button variant="outline" @click="editing = null">{{ $t("common.cancel") }}</Button>
					<Button type="submit" form="edit-course" :disabled="!formValid || update.isPending.value">
						<LoaderCircle v-if="update.isPending.value" class="animate-spin" />
						{{ $t("common.save") }}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>

		<ConfirmDialog
			v-model:open="deleteOpen"
			:title="$t('admin.courses.deleteTitle', { name: toDelete?.name ?? '' })"
			:description="$t('admin.courses.deleteText', { code: toDelete?.code ?? '' })"
			:confirm-text="$t('admin.courses.deleteConfirm')"
			:loading="removal.isPending.value"
			@confirm="toDelete && removal.mutate(toDelete.code)"
		/>
	</div>
</template>
