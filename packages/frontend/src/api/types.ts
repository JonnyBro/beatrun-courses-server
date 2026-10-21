export type PublicUser = {
	steamId: string;
	username: string | null;
	avatar: string | null;
	admin: boolean;
	createdAt: number | null;
};

export type Me = PublicUser & {
	key: string | null;
};

export type Course = {
	code: string;
	name: string;
	mapName: string;
	workshopId: string | null;
	elementsCount: number;
	downloadCount: number;
	runsCount: number;
	uploadedAt: number;
	updatedAt: number | null;
	author: PublicUser;
	preview: string | null;
	mapTitle: string | null;
};

export type CourseDetails = Course & {
	props: number | null;
	checkpoints: number | null;
	entities: number | null;
	speedLimit: number | null;
	players: number;
	bestTime: number | null;
	averageTime: number | null;
	canDelete: boolean;
};

export type Paginated<T> = {
	items: T[];
	total: number;
	page: number;
	pages: number;
};

export type CourseSort = "newest" | "oldest" | "downloads" | "runs" | "name";

export type CourseSearchParams = {
	q?: string;
	map?: string;
	author?: string;
	sort?: CourseSort;
	page?: number;
	limit?: number;
};

export type MapInfo = {
	name: string;
	count: number;
};

export type CourseRecord = {
	id: string;
	position: number;
	player: PublicUser;
	time: number;
	runs: number;
	updatedAt: number;
	points: number;
};

export type CourseRecords = Paginated<CourseRecord> & {
	mine: Omit<CourseRecord, "player"> | null;
};

export type UserRecord = {
	id: string;
	course: Course | null;
	courseCode: string;
	time: number;
	runs: number;
	updatedAt: number;
	position: number;
	points: number;
};

export type Profile = {
	user: PublicUser;
	stats: {
		courses: number;
		downloads: number;
		runsOnCourses: number;
		completed: number;
		worldRecords: number;
		points: number;
		runs: number;
		rank: number | null;
		rankedPlayers: number;
	};
};

export type SiteStats = {
	courses: number;
	users: number;
	records: number;
	maps: number;
	downloads: number;
	runs: number;
};

export type PlayerStanding = {
	position: number;
	player: PublicUser;
	points: number;
	completed: number;
	worldRecords: number;
	runs: number;
};

export type CreatorStanding = {
	position: number;
	player: PublicUser;
	courses: number;
	downloads: number;
	runs: number;
};

export type AdminUser = PublicUser & {
	courses: number;
	records: number;
};

export type AdminRecord = {
	id: string;
	courseCode: string;
	courseName: string | null;
	player: PublicUser;
	time: number;
	runs: number;
	updatedAt: number;
};
