<script setup lang="ts">
import type { PublicUser } from "@/api/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { displayName, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { computed, type HTMLAttributes } from "vue";

const props = defineProps<{
	user: Pick<PublicUser, "username" | "steamId" | "avatar"> | null | undefined;
	class?: HTMLAttributes["class"];
}>();

const name = computed(() => displayName(props.user));
</script>

<template>
	<Avatar :class="cn('size-8', props.class)">
		<AvatarImage v-if="user?.avatar" :src="user.avatar" :alt="name" />
		<AvatarFallback class="text-xs font-medium">{{ initials(name) }}</AvatarFallback>
	</Avatar>
</template>
