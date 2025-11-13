<template>
	<CardCustom class="min-w-[450px] max-w-[450px] relative">
		<template #image>
			<img
				:src="courseIcon"
				alt="ALT"
				class="object-cover h-full min-w-[100px] max-w-[250px] rounded-bl-xl rounded-tl-xl"
			/>
			<div
				class="absolute bottom-0 text-left text-sm font-mono bg-black/20 w-fit rounded-bl-xl"
			>
				<div class="bg-black/30 p-1 px-2 text-white rounded-bl-xl">
					<a
						class="hover:underline block truncate"
						:href="`https://steamcommunity.com/sharedfiles/filedetails/?id=${data.mapId}`"
						target="_blank"
					>
						{{ data.mapName }}
					</a>
					{{ data.elementsCount }} elements
				</div>
			</div>
		</template>
		<div class="flex items-start h-full">
			<div class="space-y-1 pt-1 w-full">
				<div class="flex items-center justify-between gap-6">
					<span
						class="text-xl text-left sm:text-2xl truncate font-bold font-mono flex-1"
						:title="data.name"
						>{{ data.name }}</span
					>
					<DownloadIcon
						class="cursor-pointer hover:text-red-600 transition-colors"
						@click="downloadHandler(data.code)"
					/>
				</div>
				<div class="text-left" v-for="data in datasAttributes" :key="data.label">
					<div class="flex flex-row items-center gap-1">
						<component :is="data.icon" :size="18" />
						<span
							:class="{
								'hover:cursor-pointer hover:text-red-600': data.isClicked,
							}"
							@click="data.isClicked ? data.clickHandler(data.value) : null"
							>{{ data.title }}</span
						>
					</div>
				</div>
			</div>
		</div>
		<!-- Лайки и дизлайки снизу справа -->
		<div class="absolute bottom-0 right-2 flex items-center">
			<div
				class="flex items-center gap-1 hover:bg-black/20 p-2 cursor-pointer hover:text-red-500 transition-colors"
				@click="likeHandler"
			>
				<ThumbsUpIcon :size="18" />
				<span class="text-sm font-mono select-none">{{ localLikes }}</span>
			</div>
			<div
				class="flex items-center gap-1 hover:bg-black/20 p-2 cursor-pointer hover:text-red-500 transition-colors"
				@click="dislikeHandler"
			>
				<ThumbsDownIcon :size="18" />
				<span class="text-sm font-mono select-none">{{ localDislikes }}</span>
			</div>
		</div>
	</CardCustom>
</template>

<script setup lang="ts">
import { downloadCourseByCode } from "@/api/courses";
import type { Course } from "@/api/courses/types";
import unknownImg from "@/assets/img/unknown.jpg";
import { CardCustom } from "@/components/ui/card-custom";
import {
	DownloadIcon,
	FileIcon,
	ThumbsDownIcon,
	ThumbsUpIcon,
	UploadIcon,
	User2Icon,
} from "lucide-vue-next";
import { computed, ref } from "vue";

const props = defineProps<{
	data: Course;
}>();

// Локальное состояние для лайков и дизлайков
const localLikes = ref(props.data.likes || 0);
const localDislikes = ref(props.data.dislikes || 0);

const copyToClipboard = async (text: string | undefined) => {
	if (!text) return;
	await navigator.clipboard.writeText(text);
};

const openSteamProfile = (steamId: string | undefined) => {
	if (steamId) {
		window.open(`https://steamcommunity.com/profiles/${steamId}`, "_blank");
	} else {
		console.warn("No Steam ID provided");
	}
};

const courseIcon = computed(() => {
	if (props.data.mapImg.length) {
		return props.data.mapImg;
	} else {
		return unknownImg;
	}
});

const datasAttributes = [
	{
		label: "code",
		icon: FileIcon,
		isClicked: true,
		clickHandler: (code: string | undefined) => copyToClipboard(code),
		title: props.data.code,
		value: props.data.code,
		needToolTip: true,
	},
	{
		label: "steam",
		icon: User2Icon,
		isClicked: true,
		clickHandler: (steamId: string | undefined) => openSteamProfile(steamId),
		title: props.data.uploadedBy?.username,
		value: props.data.uploadedBy?.steamId,
	},
	{
		label: "upload",
		icon: UploadIcon,
		isClicked: false,
		clickHandler: () => {},
		title: new Date(props.data.uploadedAt).toLocaleDateString(),
	},
	{
		label: "downloads",
		icon: DownloadIcon,
		isClicked: false,
		clickHandler: () => {},
		title: `${props.data.downloadCount} downloads`,
	},
];

const downloadHandler = async (code: string) => {
	const { data } = await downloadCourseByCode(code);
	const link = document.createElement("a");
	link.href = `data:text/plain;base64,${data}`;
	link.download = `${code}.txt`;
	link.click();
};

const likeHandler = () => {
	try {
		// await likeCourse(props.data.code);
		localLikes.value++;
	} catch (error) {
		console.error("Error liking course:", error);
	}
};

const dislikeHandler = () => {
	try {
		// await dislikeCourse(props.data.code);
		localDislikes.value++;
	} catch (error) {
		console.error("Error disliking course:", error);
	}
};
</script>
