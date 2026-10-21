<script setup lang="ts">
import { useAuth } from "@/composables/useAuth";
import { formatDateTime } from "@/lib/format";
import { Ban } from "lucide-vue-next";

const { me } = useAuth();
</script>

<template>
	<div v-if="me?.ban" class="mb-6 space-y-2 border-2 border-destructive bg-destructive/10 p-4">
		<p class="flex items-center gap-2 font-hud text-xl text-destructive uppercase">
			<Ban class="size-5 shrink-0" />
			{{ $t("ban.title") }}
		</p>
		<p>
			<span class="text-muted-foreground">{{ $t("ban.reason") }}</span>
			<span class="break-words whitespace-pre-line">{{ me.ban.reason }}</span>
		</p>
		<p class="text-sm text-muted-foreground">
			{{ $t("ban.text", { date: formatDateTime(me.ban.at) }) }}
		</p>
	</div>
</template>
