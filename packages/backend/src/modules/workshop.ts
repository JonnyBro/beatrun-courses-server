interface WorkshopItem {
	preview: string | null;
	title: string | null;
}

const TTL = 24 * 60 * 60 * 1000; // 24 hours
const FAILURE_TTL = 10 * 60 * 1000; // 10 minutes

const cache = new Map<string, WorkshopItem & { expiresAt: number }>();

export const getWorkshopItems = async (ids: Array<string | null | undefined>) => {
	const now = Date.now();
	const unique = [...new Set(ids.filter((id): id is string => typeof id === "string" && /^\d+$/.test(id)))];
	const missing = unique.filter(id => (cache.get(id)?.expiresAt ?? 0) < now);

	if (missing.length) {
		const body = new URLSearchParams({ itemcount: String(missing.length) });

		missing.forEach((id, i) => body.append(`publishedfileids[${i}]`, id));

		try {
			const res = await fetch("https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body,
				signal: AbortSignal.timeout(5000),
			});
			if (!res.ok) throw new Error(`Steam responded with ${res.status}`);

			const json = (await res.json()) as {
				response?: {
					publishedfiledetails?: Array<{ publishedfileid: string; preview_url?: string; title?: string }>;
				};
			};

			const details = new Map((json.response?.publishedfiledetails ?? []).map(d => [d.publishedfileid, d]));

			for (const id of missing) {
				const d = details.get(id);
				cache.set(id, {
					preview: d?.preview_url || null,
					title: d?.title || null,
					expiresAt: now + TTL,
				});
			}
		} catch (e) {
			console.error("[backend] Failed to fetch workshop items:", (e as Error).message);

			for (const id of missing) {
				if (!cache.has(id)) cache.set(id, { preview: null, title: null, expiresAt: now + FAILURE_TTL });
			}
		}
	}

	const result = new Map<string, WorkshopItem>();

	for (const id of unique) {
		const item = cache.get(id);
		if (item) result.set(id, { preview: item.preview, title: item.title });
	}

	return result;
};
