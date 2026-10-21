<script setup lang="ts">
import { loginUrl, logoutUrl } from "@/api";
import UserAvatar from "@/components/common/UserAvatar.vue";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/composables/useAuth";
import { displayName } from "@/lib/format";
import { KeyRound, LogOut, Shield, User } from "lucide-vue-next";
import { useRoute } from "vue-router";
import { SteamIcon } from "vue3-simple-icons";

const { me, isLoading } = useAuth();
const route = useRoute();
</script>

<template>
	<div v-if="isLoading" class="h-9 w-24" />

	<Button v-else-if="!me" as="a" :href="loginUrl(route.fullPath)" variant="outline" size="sm">
		<SteamIcon class="size-4" />
		{{ $t("common.signIn") }}
	</Button>

	<DropdownMenu v-else>
		<DropdownMenuTrigger as-child>
			<button
				:aria-label="$t('userMenu.account')"
				class="flex h-9 max-w-48 cursor-pointer items-center gap-2 border border-transparent px-1.5 transition-colors hover:border-foreground/30 hover:text-hl data-[state=open]:border-foreground/30"
			>
				<UserAvatar :user="me" class="size-6" />
				<span class="hidden truncate font-hud text-sm sm:inline">{{ displayName(me) }}</span>
			</button>
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end" class="w-52 font-hud uppercase">
			<DropdownMenuItem as-child>
				<RouterLink :to="{ name: 'user', params: { steamId: me.steamId } }">
					<User />
					{{ $t("userMenu.profile") }}
				</RouterLink>
			</DropdownMenuItem>
			<DropdownMenuItem as-child>
				<RouterLink :to="{ name: 'user', params: { steamId: me.steamId }, hash: '#key' }">
					<KeyRound />
					{{ $t("userMenu.gameKey") }}
				</RouterLink>
			</DropdownMenuItem>
			<DropdownMenuItem v-if="me.admin" as-child>
				<RouterLink :to="{ name: 'admin' }">
					<Shield />
					{{ $t("userMenu.admin") }}
				</RouterLink>
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem as="a" :href="logoutUrl" variant="destructive">
				<LogOut />
				{{ $t("userMenu.signOut") }}
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</template>
