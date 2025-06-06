<template>
	<div class="flex items-stretch flex-row w-fit shadow-xl bg-black/70">
		<div class="relative">
			<slot name="image" />
		</div>
		<div class="p-2 font-mono">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts"></script>
