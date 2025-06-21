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
		<div v-if="courses" class="grid gap-3 justify-center md:grid-cols-2 xl:grid-cols-3">
			<CourseCard v-for="course in courses.data" :key="course._id" :data="course" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { getCourses } from "@/api/courses";
import CourseCard from "@/components/CourseCard/CourseCard.vue";
import { useQuery } from "@tanstack/vue-query";

const { data: courses } = useQuery({
	queryKey: ["courses"],
	queryFn: getCourses,
});
</script>
