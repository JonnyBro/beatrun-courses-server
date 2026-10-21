<script setup lang="ts">
import { cn } from "@/lib/utils";

// "1." colored like the in-game scoreboard, top 3 get a star
defineProps<{ position: number; star?: boolean }>();

const placeColor: Record<number, string> = {
	1: "text-gold",
	2: "text-silver",
	3: "text-bronze",
};
</script>

<template>
	<span
		:class="
			cn(
				'inline-flex items-center gap-1 font-hud text-base tabular',
				placeColor[position] ?? 'text-muted-foreground',
			)
		"
	>
		{{ position }}.
		<span v-if="star && position <= 3" aria-hidden="true">★</span>
	</span>
</template>
