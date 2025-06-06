<template>
	<div class="text-center w-full">
		<div class="text-5xl font-bold font-mono mb-3">Courses</div>
		<div class="text-lg font-mono mb-3">
			<RouterLink
				to="key"
				class="transition-color duration-200 underline text-red-700 hover:text-red-500"
				>Authorize with Steam</RouterLink
			>
			to load and upload these courses in-game!
		</div>
		<div class="grid gap-3 justify-center md:grid-cols-2 xl:grid-cols-3">
			<CourseCard v-for="i in 10" :key="i" />
		</div>
	</div>
</template>

<script setup lang="ts">
import CourseCard from "@/components/CourseCard/CourseCard.vue";
</script>
