const fs = require("fs");
const path = require("path");

let catalog = {};

try {
    const catalogPath = path.join(__dirname, "stationCatalog.json");
    if (fs.existsSync(catalogPath)) {
        catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    }
} catch (e) {
    console.warn("⚠️ Could not load stationCatalog.json:", e.message);
}

/**
 * Validates coordinate values.
 * Coordinates must be numeric, latitude between -90 and 90, longitude between -180 and 180.
 *
 * @param {number|string|null} lat
 * @param {number|string|null} lon
 * @returns {{ valid: boolean, latitude: number|null, longitude: number|null }}
 */
function validateCoordinates(lat, lon) {
    if (lat === null || lat === undefined || lon === null || lon === undefined) {
        return { valid: false, latitude: null, longitude: null };
    }
    const numLat = Number(lat);
    const numLon = Number(lon);

    if (!Number.isFinite(numLat) || !Number.isFinite(numLon)) {
        return { valid: false, latitude: null, longitude: null };
    }

    if (numLat < -90 || numLat > 90 || numLon < -180 || numLon > 180) {
        return { valid: false, latitude: null, longitude: null };
    }

    return {
        valid: true,
        latitude: Number(numLat.toFixed(6)),
        longitude: Number(numLon.toFixed(6))
    };
}

/**
 * Returns station metadata (station_code, station_name, city, state, latitude, longitude)
 *
 * @param {string} stationCode
 * @param {string} [stationName]
 * @returns {{ station_code: string, station_name: string, city: string|null, state: string|null, latitude: number|null, longitude: number|null }}
 */
function getStationInfo(stationCode, stationName) {
    const code = String(stationCode || "").trim().toUpperCase();
    const fallbackName = stationName || code;

    if (!code) {
        return {
            station_code: null,
            station_name: fallbackName || null,
            city: null,
            state: null,
            latitude: null,
            longitude: null
        };
    }

    const matched = catalog[code];
    if (matched) {
        const validated = validateCoordinates(matched.latitude, matched.longitude);
        return {
            station_code: code,
            station_name: matched.station_name || fallbackName,
            city: matched.city || null,
            state: matched.state || null,
            latitude: validated.latitude,
            longitude: validated.longitude
        };
    }

    // Graceful fallback for unmapped stations without fake coordinates
    return {
        station_code: code,
        station_name: fallbackName,
        city: null,
        state: null,
        latitude: null,
        longitude: null
    };
}

module.exports = {
    getStationInfo,
    validateCoordinates,
    stationCatalog: catalog
};
