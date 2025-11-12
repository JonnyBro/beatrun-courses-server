import { api, type Response } from "@/plugins/axios";
import type { Course } from "./types";

export const getCourses = async () => {
	const response = await api.get<Response<Course[]>>("/api/courses/list");
	return response.data;
};

export const getCourseByCode = async (code: string) => {
	const response = await api.get<Response<Course>>(`/api/courses/info/${code}`);
	return response.data;
};

export const downloadCourseByCode = async (code: string) => {
	const response = await api.get<Response<string>>("/api/courses/download", {
		headers: {
			code,
		},
	});
	return response.data;
};

export const likeCourse = async (code: string) => {
	const response = await api.post(`/api/courses/like/${code}`);
	return response.data;
};

export const dislikeCourse = async (code: string) => {
	const response = await api.post(`/api/courses/dislike/${code}`);
	return response.data;
};
