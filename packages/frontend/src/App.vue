<script setup lang="ts">
import FooterComponent from "@/components/Footer/FooterComponent.vue";
import HeaderComponent from "@/components/Header/HeaderComponent.vue";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import { RouterView } from "vue-router";
</script>

<template>
	<DefaultLayout>
		<template #header>
			<HeaderComponent />
		</template>

		<RouterView />

		<template #footer>
			<FooterComponent />
		</template>
	</DefaultLayout>
</template>
