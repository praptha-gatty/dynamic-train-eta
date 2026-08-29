const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");
const stationMaster = require("./stationMaster");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function syncStationsMaster() {
    console.log("\n==========================================");
    console.log("🚉 SYNCING SUPABASE STATIONS MASTER TABLE");
    console.log("==========================================");

    // 1. Fetch all current stations in DB
    const { data: dbStations, error: fetchErr } = await supabase
        .from("stations")
        .select("station_code, station_name");

    if (fetchErr) {
        console.error("❌ Error fetching stations from DB:", fetchErr.message);
        return;
    }

    console.log(`Found ${dbStations.length} existing station records in Supabase 'stations' table.`);

    // 2. Prepare enriched station records
    const enrichedList = dbStations.map(s => {
        const info = stationMaster.getStationInfo(s.station_code, s.station_name);
        return {
            station_code: info.station_code,
            station_name: info.station_name,
            city: info.city,
            state: info.state,
            latitude: info.latitude,
            longitude: info.longitude
        };
    });

    // 3. Upsert to Supabase in batches
    console.log(`Upserting ${enrichedList.length} enriched station records...`);
    const BATCH_SIZE = 50;
    let updatedCount = 0;

    for (let i = 0; i < enrichedList.length; i += BATCH_SIZE) {
        const batch = enrichedList.slice(i, i + BATCH_SIZE);
        const { error: upsertErr } = await supabase
            .from("stations")
            .upsert(batch, { onConflict: "station_code" });

        if (upsertErr) {
            console.error(`❌ Batch ${i} - ${i + batch.length} failed:`, upsertErr.message);
        } else {
            updatedCount += batch.length;
        }
    }

    console.log(`✅ Successfully synced ${updatedCount} / ${dbStations.length} stations in Supabase!`);

    // 4. Verify updated stations
    const { data: verifiedStations } = await supabase
        .from("stations")
        .select("station_code, station_name, city, state, latitude, longitude")
        .in("station_code", ["DADN", "INDB", "UJN", "BPL", "VGLJ", "GWL", "AGC", "MTJ", "NZM", "NDLS", "PNP", "UMB", "LDH", "JRC", "PTKC", "JAT", "SVDK"])
        .order("station_code");

    console.log("\nSample Verified Key Stations in Supabase:");
    console.table(verifiedStations);
}

syncStationsMaster().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
