<template>
	<Card class="min-w-[250px]">
		<template #image>
			<img
				src="https://www.viewhotels.jp/ryogoku/wp-content/uploads/sites/9/2020/03/test-img.jpg"
				alt="ALT"
				class="object-cover h-fit w-fit"
			/>
			<div class="absolute bottom-0 text-left text-sm w-full font-mono bg-black/20">
				<div class="bg-black opacity-30 p-1 px-2 text-white">
					<RouterLink
						class="hover:text-red-700 hover:underline transition-colors duration-200"
						:to="computedHref"
					>
						tetete
					</RouterLink>
					<br />
					5
				</div>
			</div>
		</template>
		<div class="ml-2 flex items-center h-full">
            <div class="space-y-1 pt-1 w-full">
                
            </div>
        </div>
	</Card>
</template>

<script setup lang="ts">
import { Card } from "@/components/UI/card";
import { computed } from "vue";

const computedHref = computed(() => {
	return "https://steamcommunity.com/sharedfiles/filedetails/?id={mapID}";
});
</script>
