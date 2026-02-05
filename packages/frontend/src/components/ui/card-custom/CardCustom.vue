<template>
	<div
		class="flex items-stretch flex-row w-fit shadow-xl rounded-xl bg-card-foreground/70 dark:bg-accent-foreground/75"
	>
		<div class="relative">
			<slot name="image" />
		</div>
		<div class="p-2 font-mono text-accent min-w-0">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts"></script>
