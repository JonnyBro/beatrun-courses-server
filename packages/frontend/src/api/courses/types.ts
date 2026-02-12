export type Course = {
	_id: string;
	code: string;
	data: string;
	downloadCount: number;
	elementsCount: number;
	name: string;
	workshopId: string;
	mapName: string;
	uploadedAt: number;
	uploadedBy: null | User;
	likes: number;
	dislikes: number;
};

export type User = {
	_id: string;
	username: string;
	steamId: string;
	key: string;
};
