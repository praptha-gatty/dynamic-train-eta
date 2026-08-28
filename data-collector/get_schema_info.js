const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function inspectSchema() {
    console.log("Checking train_history...");
    const { data: histData, error: histErr } = await supabase
        .from("train_history")
        .select("*")
        .limit(1);
    if (histErr) {
        console.error("train_history error:", histErr);
    } else {
        console.log("train_history columns:", histData.length > 0 ? Object.keys(histData[0]) : "No records");
    }

    console.log("\nChecking train_current_status...");
    const { data: currData, error: currErr } = await supabase
        .from("train_current_status")
        .select("*")
        .limit(1);
    if (currErr) {
        console.error("train_current_status error:", currErr);
    } else {
        console.log("train_current_status columns:", currData.length > 0 ? Object.keys(currData[0]) : "No records");
    }

    console.log("\nChecking stations...");
    const { data: statData, error: statErr } = await supabase
        .from("stations")
        .select("*")
        .limit(1);
    if (statErr) {
        console.error("stations error:", statErr);
    } else {
        console.log("stations columns:", statData.length > 0 ? Object.keys(statData[0]) : "No records");
    }

    console.log("\nChecking trains...");
    const { data: trainData, error: trainErr } = await supabase
        .from("trains")
        .select("*")
        .limit(1);
    if (trainErr) {
        console.error("trains error:", trainErr);
    } else {
        console.log("trains columns:", trainData.length > 0 ? Object.keys(trainData[0]) : "No records");
    }
}

inspectSchema();
