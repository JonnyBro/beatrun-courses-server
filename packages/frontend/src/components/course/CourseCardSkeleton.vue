<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<template>
	<div class="hud-panel flex flex-col overflow-hidden">
		<Skeleton class="aspect-video w-full rounded-none" />
		<div class="flex flex-col gap-3 p-3">
			<Skeleton class="h-5 w-2/3" />
			<Skeleton class="h-4 w-1/2" />
			<Skeleton class="h-4 w-full" />
		</div>
	</div>
</template>
