<script setup lang="ts">
import { courseFileUrl } from "@/api";
import type { Course } from "@/api/types";
import HudIcon, { type HudIconName } from "@/components/icons/HudIcon.vue";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopy } from "@/composables/useCopy";
import { displayName, formatCompact, formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { computed } from "vue";
import CoursePreview from "./CoursePreview.vue";

const props = defineProps<{ course: Course }>();

const { copy } = useCopy();

// Short numbers on the card, the exact value and what it means in the tooltip
const stats = computed<Array<{ icon: HudIconName; value: number; tip: string }>>(() => [
	{ icon: "downloads", value: props.course.downloadCount, tip: "card.downloadsTip" },
	{ icon: "plays", value: props.course.runsCount, tip: "card.runsTip" },
	{ icon: "objects", value: props.course.elementsCount, tip: "card.elementsTip" },
]);
</script>

<template>
	<article class="group hud-panel flex flex-col overflow-hidden transition-colors hover:border-hl">
		<RouterLink :to="{ name: 'course', params: { code: course.code } }" class="absolute inset-0 z-0">
			<span class="sr-only">{{ $t("card.open", { name: course.name }) }}</span>
		</RouterLink>

		<CoursePreview
			:preview="course.preview"
			:map-name="course.mapName"
			class="pointer-events-none aspect-video w-full border-b"
		>
			<span
				class="absolute bottom-0 left-0 max-w-full truncate bg-black/70 px-2 py-0.5 font-hud text-sm text-white"
				:title="course.mapName"
			>
				{{ course.mapName }}
			</span>
		</CoursePreview>

		<div class="flex flex-1 flex-col gap-2 p-3">
			<div class="flex items-start justify-between gap-2">
				<h3 class="truncate text-lg leading-tight font-semibold group-hover:text-hl" :title="course.name">
					{{ course.name }}
				</h3>
				<Tooltip>
					<TooltipTrigger as-child>
						<button
							class="relative z-10 flex shrink-0 cursor-pointer items-center gap-1.5 border border-foreground/30 px-1.5 font-hud text-sm transition-colors hover:border-hl hover:text-hl"
							@click="copy(course.code, $t('card.codeCopied', { code: course.code }))"
						>
							{{ course.code }}
							<HudIcon name="copy" class="size-3" />
						</button>
					</TooltipTrigger>
					<TooltipContent>{{ $t("card.copyCode") }}</TooltipContent>
				</Tooltip>
			</div>

			<div class="mt-auto flex items-center justify-between gap-2 text-sm text-muted-foreground">
				<RouterLink
					:to="{ name: 'user', params: { steamId: course.author.steamId } }"
					class="relative z-10 truncate hover:text-hl"
				>
					{{ displayName(course.author) }}
				</RouterLink>
				<span class="shrink-0" :title="formatDateTime(course.uploadedAt)">
					{{ formatRelative(course.uploadedAt) }}
				</span>
			</div>

			<div class="flex items-center gap-4 border-t pt-2 font-hud text-sm text-muted-foreground">
				<Tooltip v-for="stat in stats" :key="stat.icon">
					<TooltipTrigger as-child>
						<span
							class="relative z-10 flex cursor-default items-center gap-1.5"
							tabindex="0"
							:aria-label="$t(stat.tip, { n: formatNumber(stat.value) })"
						>
							<HudIcon :name="stat.icon" class="size-3.5" />
							{{ formatCompact(stat.value) }}
						</span>
					</TooltipTrigger>
					<TooltipContent>{{ $t(stat.tip, { n: formatNumber(stat.value) }) }}</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger as-child>
						<a
							:href="courseFileUrl(course.code)"
							download
							class="relative z-10 ml-auto flex items-center gap-1.5 transition-colors hover:text-hl"
							:aria-label="$t('card.downloadFile')"
						>
							<HudIcon name="downloads" class="size-3.5" />
							.txt
						</a>
					</TooltipTrigger>
					<TooltipContent>{{ $t("card.downloadFile") }}</TooltipContent>
				</Tooltip>
			</div>
		</div>
	</article>
</template>
