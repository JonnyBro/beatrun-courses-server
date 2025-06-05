import assert from "assert";
import SteamID from "steamid";
import { type SteamUser } from "../types";

const canonicalizeRealm = (realm: string) => {
	const match = realm.match(/^(https?:\/\/[^:/]+(?::\d+)?)/);
	assert(match, `"${realm}" does not appear to be a valid realm`);

	return match[1].toLowerCase();
};

export const buildAuthUrl = (realm: string, returnUrl: string) => {
	const query = {
		"openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
		"openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
		"openid.mode": "checkid_setup",
		"openid.ns": "http://specs.openid.net/auth/2.0",
		"openid.realm": realm,
		"openid.return_to": returnUrl,
	};

	return "https://steamcommunity.com/openid/login?" + new URLSearchParams(query).toString();
};

const buildQuery = (parsedUrl: URL) => {
	const query: Record<string, string> = {};

	// Ensure all required parameters are present and signed
	["openid.assoc_handle", "openid.signed", "openid.sig"].forEach(param => {
		assert(parsedUrl.searchParams.has(param), `No "${param}" parameter is present in the URL`);

		query[param] = parsedUrl.searchParams.get(param)!;
	});

	const signedParams = query["openid.signed"].split(",");
	signedParams.forEach(param => {
		const value = parsedUrl.searchParams.get(`openid.${param}`);
		assert(value, `No "${param}" parameter is present in the URL`);

		query[`openid.${param}`] = value;
	});

	// Verify that some important parameters are signed.
	// Steam *should* check this, but let's be doubly sure.
	assert(
		["claimed_id", "return_to", "response_nonce"].every(param => query[`openid.${param}`]),
		"A vital parameter was not signed",
	);

	return query;
};

const extractClaimedId = (query: Record<string, string>) => {
	const claimedIdMatch = (query["openid.claimed_id"] || "").match(
		/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)\/?$/,
	);

	return claimedIdMatch;
};

const sanitizeQuery = (query: Record<string, string>, expectedRealm: string) => {
	// Set these params here to avoid any potential for malicious user input overwriting them
	// we will never use `query` after this point
	const sanitizedQuery: Record<string, string> = {
		...query,
		"openid.ns": "http://specs.openid.net/auth/2.0",
		"openid.mode": "check_authentication",
	};

	// Check openid.return_to from our query object,
	// because it's very important that it be a signed parameter.
	assert(
		sanitizedQuery["openid.return_to"],
		"No \"openid.return_to\" parameter is present in the URL",
	);

	const realm = canonicalizeRealm(sanitizedQuery["openid.return_to"]);
	assert(
		realm === expectedRealm,
		`Return realm "${realm}" does not match expected realm "${expectedRealm}"`,
	);

	const claimedId = extractClaimedId(sanitizedQuery);
	assert(
		claimedId,
		// eslint-disable-next-line max-len
		"No \"openid.claimed_id\" parameter is present in the URL, or it doesn't have the correct format",
	);

	return sanitizedQuery;
};

const checkParams = (url: string, expectedRealm: string) => {
	const parsedUrl = new URL(url);

	const openidMode = parsedUrl.searchParams.get("openid.mode") || "";
	assert(
		openidMode === "id_res",
		// eslint-disable-next-line max-len
		`Response parameter openid.mode value "${openidMode}" does not match expected value "id_res"`,
	);

	const query = buildQuery(parsedUrl);
	const sanitizedQuery = sanitizeQuery(query, expectedRealm);

	return sanitizedQuery;
};

const doSteamRequest = async (body: Record<string, string>) => {
	try {
		const response = await fetch("https://steamcommunity.com/openid/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Origin: "https://steamcommunity.com",
				Referer: "https://steamcommunity.com/",
			},
			body: new URLSearchParams(body).toString(),
		});

		if (!response.ok) {
			throw new Error("bollocks");
		}

		const data = await response.text();
		const isValid = data
			.replace(/\r\n/g, "\n")
			.split("\n")
			.some(line => line === "is_valid:true");

		return isValid;
	} catch (e) {
		console.error(e);
	}
};

export const checkLogin = async (url: string, expectedRealm: string) => {
	const query = checkParams("https://example.com" + url, expectedRealm);
	assert(query, "Failed to extract and verify parameters");

	const response = await doSteamRequest(query);
	assert(response, "Response was not validated by Steam. It may be forged or reused.");

	return new SteamID(extractClaimedId(query)![1]);
};

export const getSteamProfile = async (steamId: string, apiKey: string): Promise<SteamUser> => {
	const response = await fetch(
		// eslint-disable-next-line max-len
		`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`,
	);

	let data;

	const contentType = response.headers.get("content-type");

	if (contentType && contentType.indexOf("application/json") !== -1) {
		data = await response.json();
	} else {
		const text = await response.text();

		if (text?.includes("Access is denied.")) {
			throw new Error("Steam API key is invalid");
		}

		data = text;
	}

	const profile = data?.response?.players?.find(
		(profile: Record<string, unknown>) => profile.steamid === steamId,
	);

	assert(profile, "There was an error fetching your Steam profile.");

	return profile;
};
