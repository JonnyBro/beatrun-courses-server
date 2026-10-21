<script setup lang="ts">
import { getProfile, getProfileRecords, getStats, searchCourses } from "@/api";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Hint from "@/components/common/Hint.vue";
import PaginationBar from "@/components/common/PaginationBar.vue";
import PositionBadge from "@/components/common/PositionBadge.vue";
import StatTile from "@/components/common/StatTile.vue";
import UserAvatar from "@/components/common/UserAvatar.vue";
import CourseCard from "@/components/course/CourseCard.vue";
import CourseCardSkeleton from "@/components/course/CourseCardSkeleton.vue";
import GameKeyCard from "@/components/profile/GameKeyCard.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/composables/useAuth";
import { useRouteQuery } from "@/composables/useRouteQuery";
import {
	displayName,
	formatDate,
	formatDateTime,
	formatNumber,
	formatRelative,
	formatTime,
	formatTimePrecise,
	steamProfileUrl,
} from "@/lib/format";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { AxiosError } from "axios";
import { ExternalLink } from "lucide-vue-next";
import { computed, nextTick, ref, watch, watchEffect } from "vue";
import { useRoute } from "vue-router";

const COURSES_PER_PAGE = 12;
const RECORDS_PER_PAGE = 25;

const route = useRoute();
const { me } = useAuth();

const steamId = computed(() => String(route.params.steamId));
const isOwn = computed(() => me.value?.steamId === steamId.value);

const tab = useRouteQuery("tab", "records");
const coursesPage = ref(1);
const recordsPage = ref(1);
watch(steamId, () => {
	coursesPage.value = 1;
	recordsPage.value = 1;
});

const profile = useQuery({
	queryKey: ["profile", steamId],
	queryFn: () => getProfile(steamId.value),
});

const courses = useQuery({
	queryKey: ["courses", { author: steamId, page: coursesPage }],
	queryFn: () => searchCourses({ author: steamId.value, page: coursesPage.value, limit: COURSES_PER_PAGE }),
	placeholderData: keepPreviousData,
});

const records = useQuery({
	queryKey: ["profile-records", steamId, recordsPage],
	queryFn: () => getProfileRecords(steamId.value, { page: recordsPage.value, limit: RECORDS_PER_PAGE }),
	placeholderData: keepPreviousData,
});

const { data: siteStats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
const completion = computed(() => {
	const total = siteStats.value?.courses;
	const done = profile.data.value?.stats.completed ?? 0;
	return total ? Math.min(1, done / total) : 0;
});

const notFound = computed(
	() => profile.error.value instanceof AxiosError && profile.error.value.response?.status === 404,
);

// The key card only exists after the profile has loaded, so the router can't scroll to #key by itself
watch(
	() => Boolean(profile.data.value && me.value),
	async ready => {
		if (!ready || route.hash !== "#key") return;
		await nextTick();
		document.getElementById("key")?.scrollIntoView({ behavior: "smooth", block: "start" });
	},
	{ immediate: true },
);

watchEffect(() => {
	if (profile.data.value) document.title = `${displayName(profile.data.value.user)} · Beatrun Courses`;
});
</script>

<template>
	<ErrorState v-if="profile.isError.value && !notFound" :error="profile.error.value" @retry="profile.refetch()" />

	<EmptyState v-else-if="notFound" :title="$t('profile.notFound')" :description="$t('profile.notFoundText')" />

	<div v-else-if="profile.isPending.value" class="space-y-6">
		<Skeleton class="h-32 w-96 max-w-full" />
		<div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
			<Skeleton v-for="i in 6" :key="i" class="h-20" />
		</div>
	</div>

	<div v-else-if="profile.data.value" class="space-y-8">
		<!-- HUD corner with the player -->
		<section class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div class="hud-panel hud-edge flex items-center gap-4 px-4 py-3">
				<UserAvatar :user="profile.data.value.user" class="size-20 text-xl" />
				<div class="min-w-0 space-y-1.5">
					<Hint :text="$t('profile.tips.rank')" side="top">
						<p class="w-fit cursor-help font-hud text-2xl leading-none uppercase">
							★
							{{
								profile.data.value.stats.rank
									? $t("hud.rank", { rank: profile.data.value.stats.rank })
									: $t("hud.unranked")
							}}
						</p>
					</Hint>
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="truncate font-hud text-lg">{{ displayName(profile.data.value.user) }}</h1>
						<span class="font-hud text-lg text-muted-foreground">
							| {{ $t("common.points", { n: formatNumber(profile.data.value.stats.points) }) }}
						</span>
						<Badge v-if="profile.data.value.user.admin">{{ $t("common.admin") }}</Badge>
						<Badge v-if="profile.data.value.user.banned" variant="destructive">{{ $t("ban.badge") }}</Badge>
					</div>
					<Hint :text="$t('profile.tips.progress', { percent: Math.round(completion * 100) })">
						<div class="hud-bar w-48 cursor-help"><span :style="{ width: `${completion * 100}%` }" /></div>
					</Hint>
					<p class="font-hud text-sm text-muted-foreground">
						{{
							$t("profile.courses", {
								done: profile.data.value.stats.completed,
								total: siteStats?.courses ?? "?",
							})
						}}
						<template v-if="profile.data.value.user.createdAt">
							|
							<Hint :text="formatDateTime(profile.data.value.user.createdAt)">
								<span class="cursor-help">
									{{ $t("profile.joined", { date: formatDate(profile.data.value.user.createdAt) }) }}
								</span>
							</Hint>
						</template>
					</p>
				</div>
			</div>
			<Button
				as="a"
				:href="steamProfileUrl(profile.data.value.user.steamId)"
				target="_blank"
				rel="noopener"
				variant="outline"
			>
				<ExternalLink />
				{{ $t("profile.steam") }}
			</Button>
		</section>

		<GameKeyCard v-if="isOwn && me" :game-key="me.key" />

		<section class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
			<StatTile
				:label="$t('profile.stats.rank')"
				:tip="$t('profile.tips.rank')"
				:value="profile.data.value.stats.rank ? `#${profile.data.value.stats.rank}` : '—'"
				:hint="
					profile.data.value.stats.rank
						? $t('profile.stats.rankOf', { n: profile.data.value.stats.rankedPlayers })
						: $t('profile.stats.noRuns')
				"
			/>
			<StatTile
				:label="$t('profile.stats.points')"
				:value="formatNumber(profile.data.value.stats.points)"
				:tip="$t('profile.tips.points')"
			/>
			<StatTile
				:label="$t('profile.stats.records')"
				:tip="$t('profile.tips.records')"
				:value="formatNumber(profile.data.value.stats.worldRecords)"
				:hint="$t('profile.stats.recordsHint')"
			/>
			<StatTile
				icon="plays"
				:label="$t('profile.stats.completed')"
				:tip="$t('profile.tips.completed')"
				:value="formatNumber(profile.data.value.stats.completed)"
				:hint="
					$t(
						'profile.stats.runs',
						{ n: formatNumber(profile.data.value.stats.runs) },
						profile.data.value.stats.runs,
					)
				"
			/>
			<StatTile
				icon="objects"
				:label="$t('profile.stats.made')"
				:tip="$t('profile.tips.made')"
				:value="formatNumber(profile.data.value.stats.courses)"
				:hint="$t('profile.stats.madeHint')"
			/>
			<StatTile
				icon="downloads"
				:label="$t('profile.stats.downloads')"
				:tip="$t('profile.tips.downloads')"
				:value="formatNumber(profile.data.value.stats.downloads)"
				:hint="
					$t(
						'profile.stats.runsOnThem',
						{ n: formatNumber(profile.data.value.stats.runsOnCourses) },
						profile.data.value.stats.runsOnCourses,
					)
				"
			/>
		</section>

		<Tabs v-model="tab" class="space-y-4">
			<TabsList>
				<TabsTrigger value="records">
					{{ $t("profile.tabs.times") }}
					<span class="text-muted-foreground">{{ records.data.value?.total ?? "" }}</span>
				</TabsTrigger>
				<TabsTrigger value="courses">
					{{ $t("profile.tabs.courses") }}
					<span class="text-muted-foreground">{{ courses.data.value?.total ?? "" }}</span>
				</TabsTrigger>
			</TabsList>

			<TabsContent value="records" class="space-y-4">
				<ErrorState v-if="records.isError.value" :error="records.error.value" @retry="records.refetch()" />
				<div v-else-if="records.isPending.value" class="space-y-2">
					<Skeleton v-for="i in 5" :key="i" class="h-10 w-full" />
				</div>
				<EmptyState
					v-else-if="!records.data.value?.items.length"
					:title="$t('profile.noTimes')"
					:description="isOwn ? $t('profile.noTimesOwn') : undefined"
				/>
				<template v-else>
					<div class="hud-panel overflow-x-auto" :class="records.isPlaceholderData.value && 'opacity-60'">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{{ $t("table.course") }}</TableHead>
									<TableHead class="hidden md:table-cell">{{ $t("table.map") }}</TableHead>
									<TableHead class="w-20">{{ $t("table.placeLong") }}</TableHead>
									<TableHead class="text-right">{{ $t("table.time") }}</TableHead>
									<TableHead class="hidden text-right sm:table-cell">{{
										$t("table.points")
									}}</TableHead>
									<TableHead class="hidden text-right lg:table-cell">{{
										$t("table.runs")
									}}</TableHead>
									<TableHead class="hidden text-right lg:table-cell">{{
										$t("table.when")
									}}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow v-for="record in records.data.value.items" :key="record.id">
									<TableCell class="max-w-64">
										<RouterLink
											:to="{ name: 'course', params: { code: record.courseCode } }"
											class="block truncate font-semibold hover:text-hl"
										>
											{{ record.course?.name ?? record.courseCode }}
										</RouterLink>
										<span class="font-hud text-sm text-muted-foreground">{{
											record.courseCode
										}}</span>
									</TableCell>
									<TableCell
										class="hidden max-w-48 truncate font-hud text-sm text-muted-foreground md:table-cell"
									>
										{{ record.course?.mapName ?? "—" }}
									</TableCell>
									<TableCell><PositionBadge :position="record.position" star /></TableCell>
									<TableCell class="text-right font-hud text-base">
										<Hint :text="formatTimePrecise(record.time)">
											<span class="cursor-help">{{ formatTime(record.time) }}</span>
										</Hint>
									</TableCell>
									<TableCell class="hidden text-right font-hud text-base sm:table-cell">{{
										record.points
									}}</TableCell>
									<TableCell class="hidden text-right font-hud text-base lg:table-cell">{{
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
					<PaginationBar
						v-model="recordsPage"
						:total="records.data.value.total"
						:per-page="RECORDS_PER_PAGE"
					/>
				</template>
			</TabsContent>

			<TabsContent value="courses" class="space-y-4">
				<ErrorState v-if="courses.isError.value" :error="courses.error.value" @retry="courses.refetch()" />
				<div
					v-else-if="courses.isPending.value"
					class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
				>
					<CourseCardSkeleton v-for="i in 4" :key="i" />
				</div>
				<EmptyState
					v-else-if="!courses.data.value?.items.length"
					:title="$t('profile.noCourses')"
					:description="isOwn ? $t('profile.noCoursesOwn', { key: 'F4' }) : undefined"
				/>
				<template v-else>
					<div
						class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
						:class="courses.isPlaceholderData.value && 'opacity-60'"
					>
						<CourseCard v-for="course in courses.data.value.items" :key="course.code" :course="course" />
					</div>
					<PaginationBar
						v-model="coursesPage"
						:total="courses.data.value.total"
						:per-page="COURSES_PER_PAGE"
					/>
				</template>
			</TabsContent>
		</Tabs>
	</div>
</template>
