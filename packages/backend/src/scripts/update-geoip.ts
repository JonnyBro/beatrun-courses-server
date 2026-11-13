// pnpm --filter ./packages/backend update-geoip
// The server updates the database by itself unless GEOIP_AUTO_UPDATE=false, this is for doing it by hand
import { updateGeoIp } from "@/utils/geoip.js";

if (!(await updateGeoIp())) {
	console.error("[geoip] No database to download");
	process.exit(1);
}
