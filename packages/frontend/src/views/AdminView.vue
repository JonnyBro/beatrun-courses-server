<script setup lang="ts">
import { getStats } from "@/api";
import AdminCourses from "@/components/admin/AdminCourses.vue";
import AdminRecords from "@/components/admin/AdminRecords.vue";
import AdminUsers from "@/components/admin/AdminUsers.vue";
import StatTile from "@/components/common/StatTile.vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouteQuery } from "@/composables/useRouteQuery";
import { formatNumber } from "@/lib/format";
import { useQuery } from "@tanstack/vue-query";

const tab = useRouteQuery("tab", "users");

const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
</script>

<template>
	<div class="space-y-6">
		<div class="space-y-1">
			<h1 class="hud-title text-4xl">{{ $t("admin.title") }}</h1>
			<p class="text-muted-foreground">{{ $t("admin.subtitle") }}</p>
		</div>

		<section class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
			<StatTile
				:label="$t('admin.stats.users')"
				:value="formatNumber(stats?.users)"
				:tip="$t('admin.tips.users')"
			/>
			<StatTile
				icon="objects"
				:label="$t('admin.stats.courses')"
				:value="formatNumber(stats?.courses)"
				:tip="$t('admin.tips.courses')"
			/>
			<StatTile :label="$t('admin.stats.maps')" :value="formatNumber(stats?.maps)" :tip="$t('admin.tips.maps')" />
			<StatTile
				:label="$t('admin.stats.times')"
				:value="formatNumber(stats?.records)"
				:tip="$t('admin.tips.times')"
			/>
			<StatTile
				icon="plays"
				:label="$t('admin.stats.runs')"
				:value="formatNumber(stats?.runs)"
				:tip="$t('admin.tips.runs')"
			/>
			<StatTile
				icon="downloads"
				:label="$t('admin.stats.downloads')"
				:value="formatNumber(stats?.downloads)"
				:tip="$t('admin.tips.downloads')"
			/>
		</section>

		<Tabs v-model="tab" class="space-y-4">
			<TabsList>
				<TabsTrigger value="users">{{ $t("admin.tabs.users") }}</TabsTrigger>
				<TabsTrigger value="courses">{{ $t("admin.tabs.courses") }}</TabsTrigger>
				<TabsTrigger value="records">{{ $t("admin.tabs.times") }}</TabsTrigger>
			</TabsList>
			<TabsContent value="users"><AdminUsers /></TabsContent>
			<TabsContent value="courses"><AdminCourses /></TabsContent>
			<TabsContent value="records"><AdminRecords /></TabsContent>
		</Tabs>
	</div>
</template>
