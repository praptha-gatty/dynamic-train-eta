const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function verify() {
    const { data, error } = await supabase
        .from("train_history")
        .select("station_sequence, station_code, current_station, next_station, next_station_code, next_station_sequence, latitude, longitude, delay_minutes")
        .eq("train_number", "12919")
        .eq("captured_at", "2026-08-28T13:43:11.087Z")
        .order("station_sequence");

    if (error) { console.error("❌", error.message); return; }

    console.log(`\n✅ Found ${data.length} rows for train 12919 in Supabase\n`);

    console.log("FIRST 8 rows (origin -> early route):");
    console.table(data.slice(0, 8).map(r => ({
        seq: r.station_sequence,
        code: r.station_code,
        current_station: r.current_station,
        next_station: r.next_station,
        lat: r.latitude,
        lon: r.longitude
    })));

    console.log("\nMID-ROUTE sample (around seq 46-52, Vidisha area):");
    console.table(data.filter(r => r.station_sequence >= 46 && r.station_sequence <= 52).map(r => ({
        seq: r.station_sequence,
        code: r.station_code,
        current_station: r.current_station,
        next_station: r.next_station,
        lat: r.latitude,
        lon: r.longitude
    })));

    console.log("\nLAST 3 rows (final destination = null next_station):");
    console.table(data.slice(-3).map(r => ({
        seq: r.station_sequence,
        code: r.station_code,
        current_station: r.current_station,
        next_station: r.next_station,
        next_station_code: r.next_station_code,
        lat: r.latitude,
        lon: r.longitude
    })));

    const nullNextCount = data.filter(r => r.next_station === null).length;
    const nonNullNextCount = data.filter(r => r.next_station !== null).length;
    const nullLatCount = data.filter(r => r.latitude === null).length;

    console.log(`\n📊 Summary:`);
    console.log(`  Rows with next_station populated: ${nonNullNextCount}`);
    console.log(`  Rows with next_station = null (should be 1 - final destination): ${nullNextCount}`);
    console.log(`  Rows with NULL latitude (no coordinates): ${nullLatCount}`);

    process.exit(0);
}

verify().catch(err => { console.error(err); process.exit(1); });
