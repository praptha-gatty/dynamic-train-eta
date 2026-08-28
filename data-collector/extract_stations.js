const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function extractStations() {
    const { data, error } = await supabase
        .from("stations")
        .select("station_code, station_name")
        .order("station_code");
    
    if (error) {
        console.error("Error:", error);
        return;
    }
    console.log(`Found ${data.length} stations in DB.`);
    fs.writeFileSync(
        path.join(__dirname, "db_stations.json"),
        JSON.stringify(data, null, 2),
        "utf8"
    );
    console.log("Written to data-collector/db_stations.json");
}

extractStations().then(() => process.exit(0));
