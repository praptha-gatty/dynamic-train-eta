const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");
const stationMaster = require("./stationMaster");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Key South Western / Southern Railway & Malwa route stations to ensure synced
const PRIORITY_STATIONS = [
    "MAQ", "MAJN", "BNTL", "KNYR", "KBPR", "NRJ", "SBHR",
    "SKLR", "HAS", "ASK", "MYS", "SBC", "YPR", "SMVB", "UBL",
    "DWR", "BGM", "BAY", "SL", "UD", "KUDA", "BYNR", "BTJL",
    "MRDW", "KT", "GOK", "ANKL", "KAWR", "MAO", "KGQ", "KZE",
    "PAY", "CAN", "CLT", "SRR", "TCR", "ERS", "TVC", "MAS",
    "INDB", "DWX", "UJN", "BPL", "BHS", "BAQ", "BINA", "LAR",
    "BAB", "VGLB", "DBA", "GWL", "MRA", "AGC", "MTJ", "PWL",
    "FDB", "NZM", "NDLS", "PNP", "KUN", "KKDE", "UMB", "RPJ",
    "SIR", "KNN", "LDH", "PGW", "JRC", "JUC", "DZA", "MEX",
    "PTKC", "KTHU", "JAT", "UHP", "MCTM", "SVDK"
];

async function syncStationsMaster() {
    console.log("\n==========================================");
    console.log("🚉 SYNCING SUPABASE STATIONS MASTER TABLE");
    console.log("==========================================");

    // 1. Fetch all current stations in DB
    const { data: dbStations, error: fetchErr } = await supabase
        .from("stations")
        .select("station_code, station_name");

    const existingStations = dbStations || [];
    console.log(`Found ${existingStations.length} existing station records in Supabase 'stations' table.`);

    // 2. Prepare merged station codes set
    const stationCodeSet = new Set(existingStations.map(s => s.station_code));
    PRIORITY_STATIONS.forEach(code => stationCodeSet.add(code));

    // 3. Prepare enriched station records
    const enrichedList = Array.from(stationCodeSet).map(code => {
        const existing = existingStations.find(s => s.station_code === code);
        const info = stationMaster.getStationInfo(code, existing?.station_name);
        return {
            station_code: info.station_code,
            station_name: info.station_name,
            city: info.city,
            state: info.state,
            latitude: info.latitude,
            longitude: info.longitude
        };
    }).filter(s => s.latitude !== null && s.longitude !== null);

    // 4. Upsert to Supabase in batches
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

    console.log(`✅ Successfully synced ${updatedCount} stations in Supabase!`);

    // 5. Verify Southern / SWR stations in Supabase
    const { data: verifiedStations, error: vErr } = await supabase
        .from("stations")
        .select("station_code, station_name, city, state, latitude, longitude")
        .in("station_code", ["MAQ", "MAJN", "BNTL", "KBPR", "NRJ", "KNYR", "SBHR"])
        .order("station_code");

    if (!vErr && verifiedStations) {
        console.log("\nVerified MAQ -> SBHR Corridor Stations in Supabase:");
        console.table(verifiedStations);
    }
}

syncStationsMaster().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
