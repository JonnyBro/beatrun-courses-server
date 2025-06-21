export type Course = {
	_id: string;
	code: string;
	data: string;
	downloadCount: number;
	elementsCount: number;
	name: string;
	mapId: string;
	mapImg: string;
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
