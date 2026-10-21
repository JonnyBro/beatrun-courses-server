<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRoute } from "vue-router";

const ACCOUNTS = [
	{ name: "admin", label: "Dev Admin" },
	{ name: "user", label: "Dev User" },
	{ name: "user2", label: "Dev User 2" },
];

const route = useRoute();
const href = (name: string) => `/auth/dev/${name}?redirect=${encodeURIComponent(route.fullPath)}`;
</script>

<template>
	<DropdownMenu>
		<DropdownMenuTrigger as-child>
			<Button variant="outline" size="sm" class="font-hud">DEV</Button>
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end" class="font-hud uppercase">
			<DropdownMenuItem v-for="account in ACCOUNTS" :key="account.name" as="a" :href="href(account.name)">
				{{ account.label }}
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</template>
