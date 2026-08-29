const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function backfillTrainHistory() {
    console.log("==========================================");
    console.log("🚆 BACKFILLING HISTORIC NULL ROWS IN train_history");
    console.log("==========================================");

    // 1. Fetch reference lookup data: trains, stations, routes
    console.log("Fetching reference lookup data...");
    const { data: trains, error: tErr } = await supabase.from("trains").select("*");
    if (tErr) {
        console.error("❌ Error fetching trains:", tErr.message);
        return;
    }
    const trainMap = new Map(trains.map(t => [String(t.train_number).trim(), t.train_name]));

    const { data: stations, error: sErr } = await supabase.from("stations").select("*");
    if (sErr) {
        console.error("❌ Error fetching stations:", sErr.message);
        return;
    }
    const stationNameMap = new Map();
    stations.forEach(s => {
        if (s.station_name && s.station_code) {
            stationNameMap.set(s.station_name.toLowerCase().trim(), s.station_code);
            const shortName = s.station_name.replace(/Jn|Junction|Express/gi, "").trim().toLowerCase();
            if (!stationNameMap.has(shortName)) {
                stationNameMap.set(shortName, s.station_code);
            }
        }
    });

    const { data: routes, error: rErr } = await supabase.from("routes").select("*");
    if (rErr) {
        console.error("❌ Error fetching routes:", rErr.message);
        return;
    }

    // 2. Fetch all NULL rows from train_history
    console.log("Querying rows with NULL station_code in train_history...");
    const { data: nullRows, error: nullErr } = await supabase
        .from("train_history")
        .select("*")
        .is("station_code", null);

    if (nullErr) {
        console.error("❌ Error fetching NULL rows:", nullErr.message);
        return;
    }

    if (!nullRows || nullRows.length === 0) {
        console.log("✅ No NULL rows found in train_history! Database is fully populated.");
        return;
    }

    console.log(`Found ${nullRows.length} rows to backfill.`);

    let updatedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < nullRows.length; i++) {
        const row = nullRows[i];
        const updatePayload = {};

        // A. train_name
        if (!row.train_name) {
            const trainName = trainMap.get(String(row.train_number).trim());
            if (trainName) updatePayload.train_name = trainName;
        }

        // B. journey_date
        if (!row.journey_date && row.captured_at) {
            updatePayload.journey_date = String(row.captured_at).substring(0, 10);
        }

        // C. station_code
        let stationCode = row.station_code;
        if (!stationCode && row.current_station) {
            const name = String(row.current_station).toLowerCase().trim();
            stationCode = stationNameMap.get(name);
            if (!stationCode) {
                // Partial match
                const match = stations.find(s => 
                    s.station_name.toLowerCase().includes(name) || name.includes(s.station_name.toLowerCase())
                );
                if (match) stationCode = match.station_code;
            }
            if (stationCode) updatePayload.station_code = stationCode;
        }

        // D. station_sequence & distance_from_origin_km
        if (stationCode) {
            const routeMatch = routes.find(r => 
                String(r.train_number).trim() === String(row.train_number).trim() && 
                r.station_code === stationCode
            );

            if (routeMatch) {
                if (row.station_sequence === null || row.station_sequence === undefined) {
                    updatePayload.station_sequence = routeMatch.station_sequence;
                }
                if (row.distance_from_origin_km === null || row.distance_from_origin_km === undefined) {
                    updatePayload.distance_from_origin_km = routeMatch.distance_from_source;
                }

                // E. next_station_code & next_station_sequence
                const nextSeq = routeMatch.station_sequence + 1;
                const nextRouteMatch = routes.find(r => 
                    String(r.train_number).trim() === String(row.train_number).trim() && 
                    r.station_sequence === nextSeq
                );

                if (nextRouteMatch) {
                    if (!row.next_station_code) updatePayload.next_station_code = nextRouteMatch.station_code;
                    if (row.next_station_sequence === null || row.next_station_sequence === undefined) {
                        updatePayload.next_station_sequence = nextRouteMatch.station_sequence;
                    }
                }
            }
        }

        // F. is_current_location fallback
        if (row.is_current_location === null || row.is_current_location === undefined) {
            updatePayload.is_current_location = false;
        }

        if (Object.keys(updatePayload).length > 0) {
            const { error: updateErr } = await supabase
                .from("train_history")
                .update(updatePayload)
                .eq("history_id", row.history_id);

            if (updateErr) {
                console.error(`❌ Failed to update history_id ${row.history_id}:`, updateErr.message);
                failedCount++;
            } else {
                updatedCount++;
            }
        }

        if ((i + 1) % 500 === 0 || i === nullRows.length - 1) {
            console.log(`   Progress: ${i + 1}/${nullRows.length} processed (${updatedCount} updated, ${failedCount} failed)`);
        }
    }

    console.log("\n==========================================");
    console.log(`✅ BACKFILL COMPLETED: ${updatedCount} rows successfully updated.`);
    console.log("==========================================");
}

backfillTrainHistory().then(() => process.exit(0)).catch(err => {
    console.error("Backfill script error:", err);
    process.exit(1);
});
