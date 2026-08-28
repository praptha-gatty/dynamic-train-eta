const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

console.log("URL exists:", !!process.env.SUPABASE_URL);
console.log("KEY exists:", !!process.env.SUPABASE_ANON_KEY);

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
    console.log("Connecting to Supabase...");

    const { data, error } = await supabase
        .from("stations")
        .select("*")
        .limit(5);

    if (error) {
        console.error("❌ Supabase error:");
        console.error(error);
        return;
    }

    console.log("✅ Supabase connected successfully!");
    console.log("Stations:", data);
}

testConnection();