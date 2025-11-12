<template>
	<template v-if="props.variant === 'btn'">
		<Button variant="ghost" @click="toggleDark()" size="icon" class="cursor-pointer">
			<component :is="currentTheme" />
		</Button>
	</template>

	<template v-else>
		<div class="flex items-center justify-center" @click="toggleDark()">
			<component :is="currentTheme" />
		</div>
	</template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDark, useToggle } from "@vueuse/core";
import { Moon, Sun } from "lucide-vue-next";
import { Button } from "../button";

const isDark = useDark();
const toggleDark = useToggle(isDark);

const props = withDefaults(defineProps<{ variant?: "btn" | "text" }>(), {
	variant: "btn",
});

const currentTheme = computed(() => (isDark.value ? Moon : Sun));
</script>
