import { api, type Response } from "@/plugins/axios";
import type {
	AdminRecord,
	AdminUser,
	Course,
	CourseDetails,
	CourseRecords,
	CourseSearchParams,
	CreatorStanding,
	MapInfo,
	Me,
	Paginated,
	PlayerStanding,
	Profile,
	PublicUser,
	SiteStats,
	UserRecord,
} from "./types";

const get = async <T>(url: string, params?: object) => (await api.get<Response<T>>(url, { params })).data.data;

type PageParams = { page?: number; limit?: number };

// Courses
export const searchCourses = (params: CourseSearchParams) => get<Paginated<Course>>("/api/courses/search", params);
export const getMaps = () => get<MapInfo[]>("/api/courses/maps");
export const getCourse = (code: string) => get<CourseDetails>(`/api/courses/info/${encodeURIComponent(code)}`);
export const getCourseRecords = (code: string, params: PageParams) =>
	get<CourseRecords>(`/api/courses/info/${encodeURIComponent(code)}/records`, params);
export const deleteCourse = async (code: string) =>
	(await api.delete<Response<never>>(`/api/courses/info/${encodeURIComponent(code)}`)).data;
export const updateCourseFile = async (code: string, data: string) =>
	(
		await api.put<Response<{ code: string; removedRecords: number }>>(
			`/api/courses/info/${encodeURIComponent(code)}/file`,
			{ data },
		)
	).data.data;

// Stats & leaderboards
export const getStats = () => get<SiteStats>("/api/stats");
export const getPlayersLeaderboard = (params: PageParams) =>
	get<Paginated<PlayerStanding>>("/api/leaderboard/players", params);
export const getCreatorsLeaderboard = (params: PageParams) =>
	get<Paginated<CreatorStanding>>("/api/leaderboard/creators", params);

// Users
export const getMe = () => get<Me | null>("/api/users/me");
export const regenerateKey = async () => (await api.post<Response<{ key: string }>>("/api/users/me/key")).data.data;
export const getProfile = (steamId: string) => get<Profile>(`/api/users/profile/${encodeURIComponent(steamId)}`);
export const getProfileRecords = (steamId: string, params: PageParams) =>
	get<Paginated<UserRecord>>(`/api/users/profile/${encodeURIComponent(steamId)}/records`, params);

// Admin
export const adminGetUsers = (params: PageParams & { q?: string }) =>
	get<Paginated<AdminUser>>("/api/admin/users", params);
export const adminUpdateUser = async (steamId: string, body: { admin?: boolean; username?: string }) =>
	(await api.patch<Response<PublicUser>>(`/api/admin/users/${encodeURIComponent(steamId)}`, body)).data.data;
export const adminDeleteUser = async (steamId: string, purge: boolean) =>
	(
		await api.delete<Response<never>>(`/api/users/delete/${encodeURIComponent(steamId)}`, {
			params: { purge: purge ? 1 : 0 },
		})
	).data;
export const adminUpdateCourse = async (
	code: string,
	body: { name?: string; mapName?: string; workshopId?: string | null },
) => (await api.patch<Response<never>>(`/api/admin/courses/${encodeURIComponent(code)}`, body)).data;
export const adminGetRecords = (params: PageParams & { course?: string; player?: string }) =>
	get<Paginated<AdminRecord>>("/api/admin/records", params);
export const adminDeleteRecord = async (id: string) =>
	(await api.delete<Response<never>>(`/api/admin/records/${encodeURIComponent(id)}`)).data;

/** Course file the way the game saves it, works without signing in */
export const courseFileUrl = (code: string) => `/api/courses/file/${encodeURIComponent(code)}`;

export const loginUrl = (redirect = window.location.pathname) => `/auth?redirect=${encodeURIComponent(redirect)}`;
export const logoutUrl = "/auth/logout";
