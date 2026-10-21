<script setup lang="ts">
import { getMaps, getStats, searchCourses } from "@/api";
import type { CourseSort } from "@/api/types";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import PaginationBar from "@/components/common/PaginationBar.vue";
import SectionTitle from "@/components/common/SectionTitle.vue";
import CourseCard from "@/components/course/CourseCard.vue";
import CourseCardSkeleton from "@/components/course/CourseCardSkeleton.vue";
import PlayerHud from "@/components/home/PlayerHud.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouteQuery } from "@/composables/useRouteQuery";
import { formatCompact } from "@/lib/format";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { watchDebounced } from "@vueuse/core";
import { Search, X } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

const PER_PAGE = 24;

const q = useRouteQuery("q", "");
const map = useRouteQuery("map", "all");
const sort = useRouteQuery("sort", "newest");
const page = useRouteQuery("page", 1);

// Typing is debounced, the URL only changes when the user stops typing
const search = ref(q.value);
watchDebounced(search, value => (q.value = value.trim()), { debounce: 300 });
watch(q, value => {
	if (value !== search.value.trim()) search.value = value;
});

// Any filter change goes back to the first page
watch([q, map, sort], () => (page.value = 1));

const params = computed(() => ({
	q: q.value || undefined,
	map: map.value === "all" ? undefined : map.value,
	sort: sort.value as CourseSort,
	page: page.value,
	limit: PER_PAGE,
}));

const courses = useQuery({
	queryKey: ["courses", params],
	queryFn: () => searchCourses(params.value),
	placeholderData: keepPreviousData,
});

const { data: maps } = useQuery({ queryKey: ["maps"], queryFn: getMaps, staleTime: 5 * 60_000 });
const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });

const sorts: CourseSort[] = ["newest", "oldest", "downloads", "runs", "name"];

const hasFilters = computed(() => Boolean(q.value) || map.value !== "all");
// One navigation, setting both refs separately would race with each other
const router = useRouter();
const resetFilters = () => {
	search.value = "";
	void router.replace({ query: sort.value === "newest" ? {} : { sort: sort.value } });
};

const statItems = computed(() => [
	{ label: "home.stats.courses", value: stats.value?.courses },
	{ label: "home.stats.maps", value: stats.value?.maps },
	{ label: "home.stats.players", value: stats.value?.users },
	{ label: "home.stats.runs", value: stats.value?.runs },
	{ label: "home.stats.downloads", value: stats.value?.downloads },
]);
</script>

<template>
	<div class="space-y-10">
		<section class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
			<PlayerHud :total-courses="stats?.courses" />

			<div class="space-y-4 lg:max-w-xl lg:text-right">
				<i18n-t keypath="home.intro" tag="p" class="text-lg text-muted-foreground">
					<template #key><kbd>F4</kbd></template>
				</i18n-t>
				<dl class="flex flex-wrap gap-x-4 gap-y-1 font-hud text-base uppercase lg:justify-end">
					<template v-for="(item, i) in statItems" :key="item.label">
						<span v-if="i" class="text-muted-foreground" aria-hidden="true">|</span>
						<div class="flex gap-1.5">
							<dd>{{ formatCompact(item.value) }}</dd>
							<dt class="text-muted-foreground">{{ $t(item.label) }}</dt>
						</div>
					</template>
				</dl>
			</div>
		</section>

		<section class="space-y-4">
			<SectionTitle
				:title="$t('home.title')"
				:subtitle="courses.data.value ? $t('home.found', { n: courses.data.value.total }) : undefined"
			>
				<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
					<div class="relative sm:w-72">
						<Search class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input v-model="search" :placeholder="$t('home.searchPlaceholder')" class="pl-8" />
					</div>
					<Select v-model="map">
						<SelectTrigger class="w-full sm:w-48">
							<SelectValue :placeholder="$t('home.allMaps')" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{{ $t("home.allMaps") }}</SelectItem>
							<SelectItem v-for="m in maps" :key="m.name" :value="m.name">
								<span class="truncate">{{ m.name }}</span>
								<span class="ml-auto font-hud text-muted-foreground">{{ m.count }}</span>
							</SelectItem>
						</SelectContent>
					</Select>
					<Select v-model="sort">
						<SelectTrigger class="w-full sm:w-44">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem v-for="s in sorts" :key="s" :value="s">{{ $t(`home.sort.${s}`) }}</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</SectionTitle>

			<ErrorState v-if="courses.isError.value" :error="courses.error.value" @retry="courses.refetch()" />

			<div v-else-if="courses.isPending.value" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				<CourseCardSkeleton v-for="i in 8" :key="i" />
			</div>

			<EmptyState
				v-else-if="!courses.data.value?.items.length"
				:title="$t('home.empty')"
				:description="hasFilters ? $t('home.emptyFiltered') : $t('home.emptyAll')"
			>
				<Button v-if="hasFilters" variant="outline" size="sm" class="mt-2" @click="resetFilters">
					<X />
					{{ $t("home.clearFilters") }}
				</Button>
			</EmptyState>

			<template v-else>
				<div
					class="grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
					:class="courses.isPlaceholderData.value && 'opacity-60'"
				>
					<CourseCard v-for="course in courses.data.value.items" :key="course.code" :course="course" />
				</div>
				<PaginationBar v-model="page" :total="courses.data.value.total" :per-page="PER_PAGE" />
			</template>
		</section>
	</div>
</template>
