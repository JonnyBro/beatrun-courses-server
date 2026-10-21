<script setup lang="ts">
import type { PublicUser } from "@/api/types";
import { displayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "vue";
import UserAvatar from "./UserAvatar.vue";

const props = defineProps<{
	user: PublicUser;
	avatar?: boolean;
	class?: HTMLAttributes["class"];
}>();
</script>

<template>
	<RouterLink
		:to="{ name: 'user', params: { steamId: user.steamId } }"
		:class="cn('inline-flex min-w-0 items-center gap-2 transition-colors hover:text-hl', props.class)"
	>
		<UserAvatar v-if="avatar !== false" :user="user" class="size-6" />
		<span class="truncate">{{ displayName(user) }}</span>
	</RouterLink>
</template>
