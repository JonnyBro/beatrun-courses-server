<script setup lang="ts">
import { getCreatorsLeaderboard, getPlayersLeaderboard } from "@/api";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import PaginationBar from "@/components/common/PaginationBar.vue";
import PositionBadge from "@/components/common/PositionBadge.vue";
import UserLink from "@/components/common/UserLink.vue";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/composables/useAuth";
import { useRouteQuery } from "@/composables/useRouteQuery";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { computed, watch } from "vue";

const PER_PAGE = 50;

const { me } = useAuth();
const tab = useRouteQuery("tab", "players");
const page = useRouteQuery("page", 1);

watch(tab, () => (page.value = 1));

const players = useQuery({
	queryKey: ["leaderboard", "players", page],
	queryFn: () => getPlayersLeaderboard({ page: page.value, limit: PER_PAGE }),
	placeholderData: keepPreviousData,
	enabled: computed(() => tab.value === "players"),
});

const creators = useQuery({
	queryKey: ["leaderboard", "creators", page],
	queryFn: () => getCreatorsLeaderboard({ page: page.value, limit: PER_PAGE }),
	placeholderData: keepPreviousData,
	enabled: computed(() => tab.value === "creators"),
});

const rowClass = (steamId: string) => cn(me.value?.steamId === steamId && "bg-hl/10 hover:bg-hl/15");
</script>

<template>
	<div class="space-y-6">
		<div class="space-y-2">
			<h1 class="hud-title text-4xl">{{ $t("leaderboard.title") }}</h1>
			<i18n-t
				v-if="tab === 'players'"
				keypath="leaderboard.scoring"
				tag="p"
				class="max-w-3xl text-muted-foreground"
			>
				<template #formula>
					<span class="font-hud text-foreground">{{ $t("leaderboard.formula") }}</span>
				</template>
			</i18n-t>
			<p v-else class="max-w-3xl text-muted-foreground">{{ $t("leaderboard.creatorsScoring") }}</p>
		</div>

		<Tabs v-model="tab" class="space-y-4">
			<TabsList>
				<TabsTrigger value="players">{{ $t("leaderboard.players") }}</TabsTrigger>
				<TabsTrigger value="creators">{{ $t("leaderboard.creators") }}</TabsTrigger>
			</TabsList>

			<TabsContent value="players" class="space-y-4">
				<ErrorState v-if="players.isError.value" :error="players.error.value" @retry="players.refetch()" />
				<div v-else-if="players.isPending.value" class="space-y-2">
					<Skeleton v-for="i in 8" :key="i" class="h-10 w-full" />
				</div>
				<EmptyState
					v-else-if="!players.data.value?.items.length"
					:title="$t('leaderboard.emptyPlayers')"
					:description="$t('leaderboard.emptyPlayersText')"
				/>
				<template v-else>
					<div
						class="hud-panel hud-edge overflow-x-auto"
						:class="players.isPlaceholderData.value && 'opacity-60'"
					>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead class="w-20">{{ $t("table.place") }}</TableHead>
									<TableHead>{{ $t("table.player") }}</TableHead>
									<TableHead class="text-right">{{ $t("table.points") }}</TableHead>
									<TableHead class="text-right">{{ $t("table.records") }}</TableHead>
									<TableHead class="hidden text-right sm:table-cell">{{
										$t("table.courses")
									}}</TableHead>
									<TableHead class="hidden text-right md:table-cell">{{
										$t("table.runs")
									}}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow
									v-for="entry in players.data.value.items"
									:key="entry.player.steamId"
									:class="rowClass(entry.player.steamId)"
								>
									<TableCell><PositionBadge :position="entry.position" star /></TableCell>
									<TableCell class="max-w-64"><UserLink :user="entry.player" /></TableCell>
									<TableCell class="text-right font-hud text-base">{{
										formatNumber(entry.points)
									}}</TableCell>
									<TableCell class="text-right font-hud text-base">{{
										entry.worldRecords
									}}</TableCell>
									<TableCell class="hidden text-right font-hud text-base sm:table-cell">{{
										entry.completed
									}}</TableCell>
									<TableCell class="hidden text-right font-hud text-base md:table-cell">{{
										formatNumber(entry.runs)
									}}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
					<PaginationBar v-model="page" :total="players.data.value.total" :per-page="PER_PAGE" />
				</template>
			</TabsContent>

			<TabsContent value="creators" class="space-y-4">
				<ErrorState v-if="creators.isError.value" :error="creators.error.value" @retry="creators.refetch()" />
				<div v-else-if="creators.isPending.value" class="space-y-2">
					<Skeleton v-for="i in 8" :key="i" class="h-10 w-full" />
				</div>
				<EmptyState v-else-if="!creators.data.value?.items.length" :title="$t('leaderboard.emptyCreators')" />
				<template v-else>
					<div
						class="hud-panel hud-edge overflow-x-auto"
						:class="creators.isPlaceholderData.value && 'opacity-60'"
					>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead class="w-20">{{ $t("table.place") }}</TableHead>
									<TableHead>{{ $t("table.creator") }}</TableHead>
									<TableHead class="text-right">{{ $t("table.downloads") }}</TableHead>
									<TableHead class="text-right">{{ $t("table.courses") }}</TableHead>
									<TableHead class="hidden text-right sm:table-cell">{{
										$t("table.runsOn")
									}}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow
									v-for="entry in creators.data.value.items"
									:key="entry.player.steamId"
									:class="rowClass(entry.player.steamId)"
								>
									<TableCell><PositionBadge :position="entry.position" star /></TableCell>
									<TableCell class="max-w-64"><UserLink :user="entry.player" /></TableCell>
									<TableCell class="text-right font-hud text-base">{{
										formatNumber(entry.downloads)
									}}</TableCell>
									<TableCell class="text-right font-hud text-base">{{ entry.courses }}</TableCell>
									<TableCell class="hidden text-right font-hud text-base sm:table-cell">{{
										formatNumber(entry.runs)
									}}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
					<PaginationBar v-model="page" :total="creators.data.value.total" :per-page="PER_PAGE" />
				</template>
			</TabsContent>
		</Tabs>
	</div>
</template>
