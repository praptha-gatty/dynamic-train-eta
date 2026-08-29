const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function main() {
    const { data, error } = await supabase
        .from("stations")
        .select("station_code, station_name, city, state, latitude, longitude");
    if (error) {
        console.error("Error:", error);
        return;
    }
    console.log(`Total stations in Supabase: ${data.length}`);
    const sample = data.slice(0, 10);
    console.log("Sample:", JSON.stringify(sample, null, 2));
    const codes = data.map(s => s.station_code);
    console.log("All station codes:", codes.join(", "));
}

main().then(() => process.exit(0));
