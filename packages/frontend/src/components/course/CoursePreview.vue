<script setup lang="ts">
import { cn } from "@/lib/utils";
import { ref, type HTMLAttributes } from "vue";

const props = defineProps<{
	preview: string | null;
	mapName: string;
	class?: HTMLAttributes["class"];
}>();

const failed = ref(false);
</script>

<template>
	<div :class="cn('relative overflow-hidden bg-muted', props.class)">
		<img
			v-if="preview && !failed"
			:src="preview"
			:alt="mapName"
			loading="lazy"
			class="size-full object-cover"
			@error="failed = true"
		/>
		<!-- Maps without a workshop page (base game maps) -->
		<div v-else class="flex size-full items-center justify-center p-4">
			<span class="break-all text-center font-hud text-lg text-muted-foreground">{{ mapName }}</span>
		</div>
		<slot />
	</div>
</template>
