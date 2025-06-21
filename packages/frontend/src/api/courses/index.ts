import { api, type Response } from "@/plugins/axios";
import type { Course } from "./types";

export const getCourses = async () => {
	const response = await api.get<Response<Course[]>>("/courses/list");
	return response.data;
};

export const getCourseByCode = async (code: string) => {
	const response = await api.get<Response<Course>>(`/courses/info/${code}`);
	return response.data;
};

export const likeCourse = async (code: string) => {
	const response = await api.post(`/courses/like/${code}`);
	return response.data;
};

export const dislikeCourse = async (code: string) => {
	const response = await api.post(`/courses/dislike/${code}`);
	return response.data;
};
