const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const stationMaster = require("./stationMaster");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function testCollector() {
    console.log("\n==========================================");
    console.log("🚆 TESTING DATA COLLECTOR & SUPABASE INSERTION");
    console.log("==========================================");

    const API_URL = `https://railradar.in/api/v1/trains/12919/live`;
    console.log("Fetching live train 12919 from RailRadar API...");
    const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${process.env.RAILRADAR_API_KEY}` },
        timeout: 30000
    });

    const result = res.data;
    const data = result?.data;
    if (!data || !data.route) {
        console.error("❌ No route data returned from API");
        return;
    }

    const rawRoute = Array.isArray(data.route) ? data.route : [];
    const trainNumber = String(data.trainNumber || data.train?.number || "12919").trim();
    const trainName = data.trainName || data.train?.name || null;
    const journeyDate = data.startDate || new Date().toISOString().split("T")[0];
    const capturedAt = new Date().toISOString();

    // Sort route strictly by sequence
    const route = [...rawRoute]
        .filter(s => s && (s.stationCode || s.stationName))
        .sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));

    console.log(`Route length: ${route.length} stations`);

    const records = route.map((station, index) => {
        const sequence = Number(station.sequence) || (index + 1);
        const stationCode = station.stationCode ? String(station.stationCode).trim().toUpperCase() : null;
        const stationName = station.stationName ? String(station.stationName).trim() : (stationCode || "Unknown");

        // Next station from ordered route: index i -> index i + 1
        const nextRouteStation = index < route.length - 1 ? route[index + 1] : null;
        const nextStationName = nextRouteStation
            ? (nextRouteStation.stationName ? String(nextRouteStation.stationName).trim() : (nextRouteStation.stationCode || null))
            : null;
        const nextStationCode = nextRouteStation
            ? (nextRouteStation.stationCode ? String(nextRouteStation.stationCode).trim().toUpperCase() : null)
            : null;
        const nextStationSequence = nextRouteStation
            ? (Number(nextRouteStation.sequence) || (index + 2))
            : null;

        // Previous station from ordered route: index i -> index i - 1
        const prevRouteStation = index > 0 ? route[index - 1] : null;
        const previousStationName = prevRouteStation
            ? (prevRouteStation.stationName ? String(prevRouteStation.stationName).trim() : (prevRouteStation.stationCode || null))
            : null;

        const stationInfo = stationMaster.getStationInfo(stationCode, stationName);

        return {
            train_number: trainNumber,
            train_name: trainName,
            journey_date: journeyDate,
            station_sequence: sequence,
            station_code: stationCode,
            current_station: stationName,
            previous_station: previousStationName,
            next_station: nextStationName,
            next_station_code: nextStationCode,
            next_station_sequence: nextStationSequence,
            latitude: stationInfo.latitude,
            longitude: stationInfo.longitude,
            scheduled_arrival: station.scheduledArrival || null,
            actual_arrival: station.actualArrival || null,
            scheduled_departure: station.scheduledDeparture || null,
            actual_departure: station.actualDeparture || null,
            delay_minutes: Number(station.delayArrival ?? station.delayDeparture ?? 0),
            distance_from_origin_km: Number(station.distance) || 0,
            speed_kmph: Number(station.speedToNextStationKmph) || null,
            running_status: data.status || null,
            is_halt: Boolean(station.isHalt),
            captured_at: capturedAt,
            api_updated_at: data.lastUpdatedAt || null,
            // Virtual metadata for inspection
            _city: stationInfo.city,
            _state: stationInfo.state
        };
    });

    console.log("\nSample Current -> Next Station Transitions:");
    const sampleTable = records.slice(0, 15).map(r => ({
        seq: r.station_sequence,
        code: r.station_code,
        current_station: r.current_station,
        next_station: r.next_station,
        city: r._city,
        state: r._state,
        lat: r.latitude,
        lon: r.longitude
    }));
    console.table(sampleTable);

    const finalStation = records[records.length - 1];
    console.log(`\nFinal Destination Station (Seq ${finalStation.station_sequence} - ${finalStation.station_code} - ${finalStation.current_station}):`);
    console.log(`current_station: "${finalStation.current_station}", next_station: ${finalStation.next_station} (Expected: null)`);

    // Clean virtual fields before db insertion
    const dbRecords = records.map(({ _city, _state, ...rest }) => rest);

    // Insert into Supabase
    console.log(`\nInserting ${dbRecords.length} records into Supabase train_history...`);
    const { error: insErr } = await supabase
        .from("train_history")
        .insert(dbRecords);

    if (insErr) {
        console.error("❌ Supabase insert error:", insErr.message);
        return;
    }
    console.log(`✅ Successfully upserted ${dbRecords.length} records into Supabase train_history!`);

    // Query back from Supabase to verify
    console.log("\nVerifying records queried back from Supabase train_history:");
    const { data: qData, error: qErr } = await supabase
        .from("train_history")
        .select("station_sequence, station_code, current_station, next_station, next_station_code, next_station_sequence, latitude, longitude, captured_at")
        .eq("train_number", trainNumber)
        .eq("journey_date", journeyDate)
        .eq("captured_at", capturedAt)
        .order("station_sequence");

    if (qErr) {
        console.error("❌ Supabase query error:", qErr.message);
    } else {
        console.log(`Found ${qData.length} records in Supabase for this capture.`);
        console.log("\nFirst 10 rows in Supabase:");
        console.table(qData.slice(0, 10));
        console.log("\nLast 3 rows in Supabase (including final destination):");
        console.table(qData.slice(-3));
    }
}

testCollector().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
