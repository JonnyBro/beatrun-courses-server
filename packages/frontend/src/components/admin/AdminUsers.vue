<script setup lang="ts">
import { adminDeleteUser, adminGetUsers, adminUpdateUser } from "@/api";
import type { AdminUser } from "@/api/types";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import ErrorState from "@/components/common/ErrorState.vue";
import Hint from "@/components/common/Hint.vue";
import PaginationBar from "@/components/common/PaginationBar.vue";
import UserLink from "@/components/common/UserLink.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/composables/useAuth";
import { displayName, formatDate, formatDateTime, steamProfileUrl } from "@/lib/format";
import { getErrorMessage } from "@/plugins/axios";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { refDebounced } from "@vueuse/core";
import { Ellipsis, ExternalLink, Search, Shield, ShieldOff, Trash2 } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const PER_PAGE = 25;

const { me } = useAuth();
const { t } = useI18n();
const queryClient = useQueryClient();

const search = ref("");
const q = refDebounced(search, 300);
const page = ref(1);
watch(q, () => (page.value = 1));

const params = computed(() => ({ q: q.value.trim() || undefined, page: page.value, limit: PER_PAGE }));
const users = useQuery({
	queryKey: ["admin", "users", params],
	queryFn: () => adminGetUsers(params.value),
	placeholderData: keepPreviousData,
});

const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

const toggleAdmin = useMutation({
	mutationFn: (user: AdminUser) => adminUpdateUser(user.steamId, { admin: !user.admin }),
	onSuccess: async user => {
		toast.success(
			t(user.admin ? "admin.users.nowAdmin" : "admin.users.noLongerAdmin", { name: displayName(user) }),
		);
		await invalidate();
	},
	onError: error => toast.error(getErrorMessage(error)),
});

const toDelete = ref<AdminUser | null>(null);
const deleteOpen = computed({
	get: () => Boolean(toDelete.value),
	set: value => {
		if (!value) toDelete.value = null;
	},
});
const purge = ref(false);

const removal = useMutation({
	mutationFn: (user: AdminUser) => adminDeleteUser(user.steamId, purge.value),
	onSuccess: async () => {
		toast.success(t("admin.users.deleted"));
		toDelete.value = null;
		purge.value = false;
		await invalidate();
		await queryClient.invalidateQueries({ queryKey: ["courses"] });
	},
	onError: error => toast.error(getErrorMessage(error)),
});
</script>

<template>
	<div class="space-y-4">
		<div class="relative max-w-sm">
			<Search class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input v-model="search" :placeholder="$t('admin.users.search')" class="pl-8" />
		</div>

		<ErrorState v-if="users.isError.value" :error="users.error.value" @retry="users.refetch()" />
		<div v-else-if="users.isPending.value" class="space-y-2">
			<Skeleton v-for="i in 8" :key="i" class="h-10 w-full" />
		</div>
		<EmptyState v-else-if="!users.data.value?.items.length" :title="$t('admin.users.empty')" />
		<template v-else>
			<div class="hud-panel overflow-x-auto" :class="users.isPlaceholderData.value && 'opacity-60'">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{{ $t("table.user") }}</TableHead>
							<TableHead class="hidden md:table-cell">{{ $t("table.steamId") }}</TableHead>
							<TableHead class="text-right">
								<Hint :text="$t('admin.tips.userCourses')"
									><span class="cursor-help">{{ $t("table.courses") }}</span></Hint
								>
							</TableHead>
							<TableHead class="text-right">
								<Hint :text="$t('admin.tips.userTimes')"
									><span class="cursor-help">{{ $t("table.times") }}</span></Hint
								>
							</TableHead>
							<TableHead class="hidden text-right sm:table-cell">{{ $t("table.joined") }}</TableHead>
							<TableHead class="w-12" />
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow v-for="user in users.data.value.items" :key="user.steamId">
							<TableCell class="max-w-56">
								<div class="flex items-center gap-2">
									<UserLink :user="user" />
									<Badge v-if="user.admin" variant="secondary"
										><Shield /> {{ $t("common.admin") }}</Badge
									>
								</div>
							</TableCell>
							<TableCell class="hidden font-hud text-sm text-muted-foreground md:table-cell">{{
								user.steamId
							}}</TableCell>
							<TableCell class="text-right font-hud text-base">{{ user.courses }}</TableCell>
							<TableCell class="text-right font-hud text-base">{{ user.records }}</TableCell>
							<TableCell class="hidden text-right text-muted-foreground sm:table-cell">
								<Hint :text="formatDateTime(user.createdAt)">
									<span class="cursor-help">{{ formatDate(user.createdAt) }}</span>
								</Hint>
							</TableCell>
							<TableCell>
								<Hint :text="$t('common.actions')">
									<span class="inline-flex">
										<DropdownMenu>
											<DropdownMenuTrigger as-child>
												<Button
													variant="ghost"
													size="icon-sm"
													:aria-label="$t('common.actions')"
													><Ellipsis
												/></Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													as="a"
													:href="steamProfileUrl(user.steamId)"
													target="_blank"
													rel="noopener"
												>
													<ExternalLink />
													{{ $t("common.steamProfile") }}
												</DropdownMenuItem>
												<DropdownMenuItem
													:disabled="user.steamId === me?.steamId"
													@select="toggleAdmin.mutate(user)"
												>
													<ShieldOff v-if="user.admin" />
													<Shield v-else />
													{{
														user.admin
															? $t("admin.users.removeAdmin")
															: $t("admin.users.makeAdmin")
													}}
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													variant="destructive"
													:disabled="user.steamId === me?.steamId"
													@select="toDelete = user"
												>
													<Trash2 />
													{{ $t("admin.users.delete") }}
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</span>
								</Hint>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
			<PaginationBar v-model="page" :total="users.data.value.total" :per-page="PER_PAGE" />
		</template>

		<ConfirmDialog
			v-model:open="deleteOpen"
			:title="$t('admin.users.deleteTitle', { name: displayName(toDelete) })"
			:description="$t('admin.users.deleteText')"
			:confirm-text="$t('admin.users.delete')"
			:loading="removal.isPending.value"
			@confirm="toDelete && removal.mutate(toDelete)"
		>
			<Label class="flex items-start gap-2 rounded-md border p-3 font-normal">
				<input v-model="purge" type="checkbox" class="mt-0.5 accent-[var(--destructive)]" />
				<span class="space-y-0.5">
					<span class="block font-medium">{{ $t("admin.users.purge") }}</span>
					<span class="block text-xs text-muted-foreground">
						{{
							$t("admin.users.purgeText", {
								courses: $t("admin.users.purgeCourses", toDelete?.courses ?? 0),
								times: $t("admin.users.purgeTimes", toDelete?.records ?? 0),
							})
						}}
					</span>
				</span>
			</Label>
		</ConfirmDialog>
	</div>
</template>
