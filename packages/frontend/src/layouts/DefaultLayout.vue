<template>
	<div class="min-h-dvh relative max-w-full box-content">
		<template v-if="!isRouterReady">
			<div class="flex items-center justify-center h-screen">
				<LoaderCircle class="animate-spin" :size="64" />
			</div>
		</template>
		<template v-else>
			<div class="flex flex-col min-h-screen">
				<header class="p-2 border-b-2">
					<slot name="header" />
				</header>
				<main class="p-4 flex-grow overflow-y-auto">
					<slot />
				</main>
				<footer class="p-4 border-t-2">
					<slot name="footer" />
				</footer>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LoaderCircle } from 'lucide-vue-next'

const router = useRouter()

const isRouterReady = ref(false)

router.isReady().then(() => (isRouterReady.value = true))
</script>
