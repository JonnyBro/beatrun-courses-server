<template>
	<nav class="flex items-center justify-between px-4 font-mono h-9">
		<RouterLink
			to="/"
			class="text-lg font-bold hover:text-red-700 dark:hover:text-slate-300 transition-colors duration-200"
		>
			beatrun.ru | Courses Database
		</RouterLink>

		<div class="md:hidden">
			<DropdownMenu v-model:open="isMenuOpen">
				<DropdownMenuTrigger as-child>
					<Button as-child variant="ghost" size="icon">
						<Menu />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuLabel>Меню</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem v-for="link in menuLinks" :key="link.label" as-child>
						<a
							target="_blank"
							:href="link.link"
							class="flex items-center gap-2 cursor-pointer"
						>
							<component :is="link.icon" />
							<span> {{ link.label }} </span>
						</a>
					</DropdownMenuItem>
					<DropdownMenuItem class="cursor-pointer">
						<ToggleTheme variant="text" class="w-full" />
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>

		<div class="hidden md:flex items-center gap-2">
			<Button as-child v-for="link in menuLinks" :key="link.label" variant="ghost">
				<a target="_blank" :href="link.link" class="flex items-center gap-2">
					<component :is="link.icon" />
					<span> {{ link.label }} </span>
				</a>
			</Button>
			<ToggleTheme />
		</div>
	</nav>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { Github, Server, Menu } from 'lucide-vue-next'
import { ToggleTheme } from '../UI/ToggleTheme'
import { Button } from '../UI/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../UI/dropdown-menu'

const isMenuOpen = ref(false)

const { width } = useWindowSize()

const menuLinks = [
	{
		label: 'My fork',
		link: 'https://github.com/JonnyBro/beatrun',
		icon: Github,
	},
	{
		label: 'Our Discrod',
		link: 'https://discord.com/invite/93Psubbgsg',
		icon: Server,
	},
]

watch(
	() => width.value,
	newWidth => {
		if (newWidth >= 767) {
			isMenuOpen.value = false
		}
	},
)
</script>
