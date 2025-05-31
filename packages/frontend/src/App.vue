<script setup lang="ts">
import { RouterView } from 'vue-router'
import DefaultLayout from './layouts/DefaultLayout.vue'
import HeaderComponent from './components/Header/HeaderComponent.vue'
import FooterComponent from './components/Footer/FooterComponent.vue'
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
