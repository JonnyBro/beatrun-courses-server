<script setup lang="ts">
import { courseFileUrl, deleteCourse, getCourse, getCourseRecords } from "@/api";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Hint from "@/components/common/Hint.vue";
import PaginationBar from "@/components/common/PaginationBar.vue";
import PositionBadge from "@/components/common/PositionBadge.vue";
import SectionTitle from "@/components/common/SectionTitle.vue";
import StatTile from "@/components/common/StatTile.vue";
import UserLink from "@/components/common/UserLink.vue";
import CoursePreview from "@/components/course/CoursePreview.vue";
import HudIcon from "@/components/icons/HudIcon.vue";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/composables/useAuth";
import { useCopy } from "@/composables/useCopy";
import {
	formatDate,
	formatDateTime,
	formatGap,
	formatNumber,
	formatRelative,
	formatTime,
	formatTimePrecise,
	workshopUrl,
} from "@/lib/format";
import { getErrorMessage } from "@/plugins/axios";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { AxiosError } from "axios";
import { ExternalLink, Trash2 } from "lucide-vue-next";
import { computed, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const PER_PAGE = 25;

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const { me } = useAuth();
const { copy } = useCopy();
const { t } = useI18n();

const code = computed(() => String(route.params.code));
const page = ref(1);

const course = useQuery({
	queryKey: ["course", code],
	queryFn: () => getCourse(code.value),
});

const records = useQuery({
	queryKey: ["course-records", code, page],
	queryFn: () => getCourseRecords(code.value, { page: page.value, limit: PER_PAGE }),
	placeholderData: keepPreviousData,
});

const notFound = computed(
	() => course.error.value instanceof AxiosError && course.error.value.response?.status === 404,
);

watchEffect(() => {
	if (course.data.value) document.title = `${course.data.value.name} · Beatrun Courses`;
});

const deleteOpen = ref(false);
const removal = useMutation({
	mutationFn: () => deleteCourse(code.value),
	onSuccess: async () => {
		toast.success(t("course.deleted"));
		deleteOpen.value = false;
		await queryClient.invalidateQueries({ queryKey: ["courses"] });
		await router.push({ name: "home" });
	},
	onError: error => toast.error(getErrorMessage(error)),
});

const isMine = (steamId: string) => me.value?.steamId === steamId;
</script>

<template>
	<ErrorState v-if="course.isError.value && !notFound" :error="course.error.value" @retry="course.refetch()" />

	<EmptyState v-else-if="notFound" :title="$t('course.notFound')" :description="$t('course.notFoundText', { code })">
		<Button as-child variant="outline" size="sm" class="mt-2">
			<RouterLink :to="{ name: 'home' }">{{ $t("common.backToCourses") }}</RouterLink>
		</Button>
	</EmptyState>

	<div v-else-if="course.isPending.value" class="space-y-6">
		<div class="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
			<Skeleton class="aspect-video w-full" />
			<div class="space-y-3">
				<Skeleton class="h-10 w-2/3" />
				<Skeleton class="h-5 w-1/3" />
				<Skeleton class="h-11 w-56" />
			</div>
		</div>
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			<Skeleton v-for="i in 8" :key="i" class="h-20" />
		</div>
	</div>

	<div v-else-if="course.data.value" class="space-y-10">
		<section class="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
			<CoursePreview
				:preview="course.data.value.preview"
				:map-name="course.data.value.mapName"
				class="hud-panel aspect-video w-full"
			/>

			<div class="flex min-w-0 flex-col gap-4">
				<div class="space-y-2">
					<p class="font-hud text-base text-muted-foreground">
						{{ course.data.value.mapName }}
						<template v-if="course.data.value.speedLimit">
							| {{ $t("course.speedLimit", { n: course.data.value.speedLimit }) }}
						</template>
					</p>
					<h1 class="font-hud text-4xl leading-tight break-words">{{ course.data.value.name }}</h1>
					<p class="text-muted-foreground">
						<i18n-t keypath="course.byline">
							<template #author>
								<UserLink :user="course.data.value.author" :avatar="false" class="text-foreground" />
							</template>
							<template #when>
								<Hint :text="formatDateTime(course.data.value.uploadedAt)">
									<span class="cursor-help underline decoration-dotted underline-offset-4">
										{{ formatRelative(course.data.value.uploadedAt) }}
									</span>
								</Hint>
							</template>
						</i18n-t>
						<template v-if="course.data.value.mapTitle"> · {{ course.data.value.mapTitle }}</template>
					</p>
				</div>

				<div class="flex flex-wrap items-stretch gap-2">
					<Hint :text="$t('card.copyCode')">
						<button
							class="hud-panel hud-edge flex cursor-pointer items-center gap-3 px-4 py-2 font-hud text-2xl transition-colors hover:border-hl hover:text-hl"
							@click="copy(course.data.value.code, $t('course.codeCopied'))"
						>
							{{ course.data.value.code }}
							<HudIcon name="copy" class="size-4" />
						</button>
					</Hint>
					<Button
						as="a"
						:href="courseFileUrl(course.data.value.code)"
						download
						variant="outline"
						class="h-auto"
					>
						<HudIcon name="downloads" />
						{{ $t("course.downloadFile") }}
					</Button>
					<Button
						v-if="course.data.value.workshopId"
						as="a"
						:href="workshopUrl(course.data.value.workshopId)"
						target="_blank"
						rel="noopener"
						variant="outline"
						class="h-auto"
					>
						<ExternalLink />
						{{ $t("course.workshop") }}
					</Button>
					<Button
						v-if="course.data.value.canDelete"
						variant="destructive"
						class="h-auto"
						@click="deleteOpen = true"
					>
						<Trash2 />
						{{ $t("common.delete") }}
					</Button>
				</div>

				<i18n-t keypath="course.howTo" tag="p" class="text-muted-foreground">
					<template #map
						><span class="font-hud text-foreground">{{ course.data.value.mapName }}</span></template
					>
					<template #key><kbd>F4</kbd></template>
				</i18n-t>
				<i18n-t keypath="course.fileHint" tag="p" class="text-sm text-muted-foreground">
					<template #path>
						<span class="font-hud break-all text-foreground"
							>garrysmod/data/beatrun/courses/{{ course.data.value.mapName }}/</span
						>
					</template>
				</i18n-t>
			</div>
		</section>

		<section class="grid grid-cols-2 gap-3 md:grid-cols-4">
			<StatTile
				:label="$t('course.stats.record')"
				:value="formatTime(course.data.value.bestTime)"
				:hint="formatTimePrecise(course.data.value.bestTime)"
				:tip="$t('course.tips.record')"
			/>
			<StatTile
				:label="$t('course.stats.average')"
				:value="formatTime(course.data.value.averageTime)"
				:tip="$t('course.tips.average')"
			/>
			<StatTile
				:label="$t('course.stats.players')"
				:value="formatNumber(course.data.value.players)"
				:tip="$t('course.tips.players')"
			/>
			<StatTile
				icon="plays"
				:label="$t('course.stats.runs')"
				:value="formatNumber(course.data.value.runsCount)"
				:tip="$t('course.tips.runs')"
			/>
			<StatTile
				icon="downloads"
				:label="$t('course.stats.downloads')"
				:value="formatNumber(course.data.value.downloadCount)"
				:tip="$t('course.tips.downloads')"
			/>
			<StatTile
				:label="$t('course.stats.checkpoints')"
				:value="formatNumber(course.data.value.checkpoints)"
				:tip="$t('course.tips.checkpoints')"
			/>
			<StatTile
				icon="objects"
				:label="$t('course.stats.elements')"
				:value="formatNumber(course.data.value.elementsCount)"
				:hint="
					course.data.value.props !== null
						? $t('course.stats.elementsHint', {
								props: course.data.value.props,
								entities: course.data.value.entities,
							})
						: undefined
				"
				:tip="$t('course.tips.elements')"
			/>
			<StatTile
				:label="$t('course.stats.uploaded')"
				:value="formatDate(course.data.value.uploadedAt)"
				:tip="formatDateTime(course.data.value.uploadedAt)"
				class="[&>span:nth-child(2)]:text-xl"
			/>
		</section>

		<section class="space-y-4">
			<SectionTitle :title="$t('course.leaderboard')" :subtitle="$t('course.leaderboardHint')">
				<div
					v-if="records.data.value?.mine"
					class="hud-panel hud-edge flex items-center gap-3 px-3 py-1.5 font-hud text-base"
				>
					<span class="text-muted-foreground uppercase">{{ $t("course.you") }}</span>
					<PositionBadge :position="records.data.value.mine.position" />
					<span>{{ formatTime(records.data.value.mine.time) }}</span>
				</div>
			</SectionTitle>

			<ErrorState v-if="records.isError.value" :error="records.error.value" @retry="records.refetch()" />

			<div v-else-if="records.isPending.value" class="space-y-2">
				<Skeleton v-for="i in 5" :key="i" class="h-10 w-full" />
			</div>

			<EmptyState
				v-else-if="!records.data.value?.items.length"
				:title="$t('course.noRuns')"
				:description="$t('course.noRunsText')"
			/>

			<template v-else>
				<div class="hud-panel overflow-x-auto" :class="records.isPlaceholderData.value && 'opacity-60'">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead class="w-20">{{ $t("table.place") }}</TableHead>
								<TableHead>{{ $t("table.player") }}</TableHead>
								<TableHead class="text-right">{{ $t("table.time") }}</TableHead>
								<TableHead class="hidden text-right sm:table-cell">{{ $t("table.gap") }}</TableHead>
								<TableHead class="hidden text-right md:table-cell">{{ $t("table.points") }}</TableHead>
								<TableHead class="hidden text-right md:table-cell">{{ $t("table.runs") }}</TableHead>
								<TableHead class="hidden text-right lg:table-cell">{{ $t("table.when") }}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow
								v-for="record in records.data.value.items"
								:key="record.id"
								:class="isMine(record.player.steamId) && 'bg-hl/10 hover:bg-hl/15'"
							>
								<TableCell><PositionBadge :position="record.position" star /></TableCell>
								<TableCell class="max-w-56"><UserLink :user="record.player" /></TableCell>
								<TableCell class="text-right font-hud text-base">
									<Hint :text="formatTimePrecise(record.time)">
										<span class="cursor-help">{{ formatTime(record.time) }}</span>
									</Hint>
								</TableCell>
								<TableCell
									class="hidden text-right font-hud text-base text-muted-foreground sm:table-cell"
								>
									{{ formatGap(record.time, course.data.value.bestTime ?? record.time) ?? "" }}
								</TableCell>
								<TableCell class="hidden text-right font-hud text-base md:table-cell">{{
									record.points
								}}</TableCell>
								<TableCell class="hidden text-right font-hud text-base md:table-cell">{{
									record.runs
								}}</TableCell>
								<TableCell class="hidden text-right text-muted-foreground lg:table-cell">
									<Hint :text="formatDateTime(record.updatedAt)">
										<span class="cursor-help">{{ formatRelative(record.updatedAt) }}</span>
									</Hint>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>
				<PaginationBar v-model="page" :total="records.data.value.total" :per-page="PER_PAGE" />
			</template>
		</section>

		<ConfirmDialog
			v-model:open="deleteOpen"
			:title="$t('course.deleteTitle')"
			:description="$t('course.deleteText', { name: course.data.value.name, code: course.data.value.code })"
			:confirm-text="$t('common.delete')"
			:loading="removal.isPending.value"
			@confirm="removal.mutate()"
		/>
	</div>
</template>
