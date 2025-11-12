import axios, { AxiosError } from "axios";

const baseURL = "http://localhost:5173/api";

export const api = axios.create({
	baseURL,
	withCredentials: true,
});

api.interceptors.response.use(
	config => config,
	(error: AxiosError) => {
		console.log(error);
		return Promise.reject(error);
	},
);

export type Response<T> = {
	code: number;
	data: T;
};
