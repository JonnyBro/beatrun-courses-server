<script setup lang="ts">
import { updateCourseFile } from "@/api";
import type { CourseDetails } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/format";
import { getErrorMessage } from "@/plugins/axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { LoaderCircle, TriangleAlert } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const props = defineProps<{ course: CourseDetails }>();
const open = defineModel<boolean>("open", { required: true });

const { t } = useI18n();
const queryClient = useQueryClient();

const file = ref<File | null>(null);
const understood = ref(false);

watch(open, value => {
	if (!value) return;

	file.value = null;
	understood.value = false;
});

const toBase64 = async (blob: Blob) => {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	let binary = "";

	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}

	return btoa(binary);
};

const update = useMutation({
	mutationFn: async () => updateCourseFile(props.course.code, await toBase64(file.value!)),
	onSuccess: async data => {
		toast.success(t("course.update.done", { n: data.removedRecords }));
		open.value = false;

		await queryClient.invalidateQueries({ queryKey: ["course", props.course.code] });
		await queryClient.invalidateQueries({ queryKey: ["course-records", props.course.code] });
		await queryClient.invalidateQueries({ queryKey: ["courses"] });
	},
	onError: error => toast.error(getErrorMessage(error)),
});

const canSubmit = computed(() => Boolean(file.value) && understood.value && !update.isPending.value);

const onFile = (event: Event) => {
	file.value = (event.target as HTMLInputElement).files?.[0] ?? null;
};
</script>

<template>
	<Dialog v-model:open="open">
		<DialogContent>
			<DialogHeader>
				<DialogTitle>{{ $t("course.update.title") }}</DialogTitle>
				<DialogDescription>
					{{ $t("course.update.text", { name: course.name, code: course.code }) }}
				</DialogDescription>
			</DialogHeader>

			<div class="space-y-3 border-2 border-destructive bg-destructive/10 p-4">
				<p class="flex items-center gap-2 font-hud text-lg text-destructive uppercase">
					<TriangleAlert class="size-5 shrink-0" />
					{{ $t("course.update.warningTitle") }}
				</p>
				<ul class="list-inside list-disc space-y-1 text-sm">
					<li>{{ $t("course.update.lostRecords", { n: formatNumber(course.players) }) }}</li>
					<li>{{ $t("course.update.lostRuns", { n: formatNumber(course.runsCount) }) }}</li>
					<li>{{ $t("course.update.lostTimes") }}</li>
					<li>{{ $t("course.update.lostPoints") }}</li>
				</ul>
				<p class="text-sm text-muted-foreground">{{ $t("course.update.kept") }}</p>
			</div>

			<div class="space-y-2">
				<Label for="course-file">{{ $t("course.update.file") }}</Label>
				<Input id="course-file" type="file" accept=".txt" @change="onFile" />
				<p class="text-xs text-muted-foreground">{{ $t("course.update.fileHint") }}</p>
			</div>

			<label class="flex cursor-pointer items-start gap-2 text-sm">
				<input v-model="understood" type="checkbox" class="mt-0.5 size-4 accent-destructive" />
				{{ $t("course.update.confirm") }}
			</label>

			<DialogFooter>
				<Button variant="outline" @click="open = false">{{ $t("common.cancel") }}</Button>
				<Button variant="destructive" :disabled="!canSubmit" @click="update.mutate()">
					<LoaderCircle v-if="update.isPending.value" class="animate-spin" />
					{{ $t("course.update.submit") }}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</template>
