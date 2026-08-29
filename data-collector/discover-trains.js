const path = require("path");
const fs = require("fs");
const axios = require("axios");
const dotenv = require("dotenv");

// Load .env from the project root
dotenv.config({
    path: path.join(__dirname, "..", ".env")
});
const { createClient } = require("@supabase/supabase-js");


// ==========================================
// SUPABASE CONNECTION
// ==========================================

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);


// ==========================================
// CONFIGURATION
// ==========================================

// Candidate trains to test (CLI arguments or default list)
const cliArgs = process.argv.slice(2).map(arg => arg.trim()).filter(Boolean);

const CANDIDATE_TRAINS = cliArgs.length > 0
    ? cliArgs
    : [
        "12919",
        "12920",
        "12921",
        "12922",
        "12923",
        "12924",
        "12925",
        "12926",
        "12927",
        "12928"
    ];


// ==========================================
// ACTIVE TRAINS FILE
// ==========================================

const ACTIVE_TRAINS_FILE = path.join(
    __dirname,
    "..",
    "data",
    "active-trains.json"
);


// ==========================================
// TEST ONE TRAIN
// ==========================================

async function testTrain(trainNumber) {

    const API_URL =
        `https://railradar.in/api/v1/trains/${trainNumber}/live`;

    const maxRetries = 2;
    let attempt = 0;
    let response = null;

    while (attempt <= maxRetries) {
        try {
            response = await axios.get(
                API_URL,
                {
                    headers: {
                        Authorization:
                            `Bearer ${process.env.RAILRADAR_API_KEY}`
                    },
                    timeout: 5000
                }
            );
            break;
        } catch (error) {
            attempt++;
            if (attempt > maxRetries || error.response?.status === 404 || error.response?.status === 401) {
                throw error;
            }
            const backoff = 1000 * Math.pow(2, attempt - 1);
            console.log(`   Retry ${attempt}/${maxRetries} for ${trainNumber} in ${backoff}ms...`);
            await new Promise(r => setTimeout(r, backoff));
        }
    }

    try {
        const result = response.data;
        const data = result.data || {};

        const route =
            Array.isArray(data.route) ? data.route : [];


        if (!route.length) {

            console.log(
                `⚠️ ${trainNumber} → No route data`
            );

            return null;
        }

        const trainName = data.trainName || data.train?.name || null;
        const trainType = data.train?.type || data.train?.category || null;
        const sourceStation = data.train?.source?.name || data.train?.source?.code || route[0]?.stationName || null;
        const destinationStation = data.train?.destination?.name || data.train?.destination?.code || route[route.length - 1]?.stationName || null;

        console.log(
            `✅ ${trainNumber} → Valid train: "${trainName}" (${route.length} route records)`
        );

        return {
            train_number: String(data.trainNumber || data.train?.number || trainNumber).trim(),
            train_name: trainName,
            train_type: trainType,
            source_station: sourceStation,
            destination_station: destinationStation
        };

    }

    catch (error) {

        if (error.response) {

            const status =
                error.response.status;


            if (status === 401) {

                console.log(
                    `❌ ${trainNumber} → Unauthorized`
                );

            }

            else if (status === 404) {

                console.log(
                    `❌ ${trainNumber} → Train not found`
                );

            }

            else {

                console.log(
                    `❌ ${trainNumber} → HTTP ${status}`
                );

            }

        }

        else {

            console.log(
                `❌ ${trainNumber} → ${error.message}`
            );

        }

        return null;
    }
}


// ==========================================
// SAVE TRAINS TO SUPABASE (UPSERT DETAILS)
// ==========================================

async function saveTrainsToSupabase(trainDetailsList) {

    console.log(
        "\n=========================================="
    );

    console.log(
        "💾 UPDATING SUPABASE TRAINS TABLE WITH FULL DETAILS"
    );

    console.log(
        "=========================================="
    );


    for (const item of trainDetailsList) {

        try {

            const {
                data,
                error
            } = await supabase
                .from("trains")
                .upsert({
                    train_number: item.train_number,
                    train_name: item.train_name,
                    train_type: item.train_type,
                    source_station: item.source_station,
                    destination_station: item.destination_station
                }, { onConflict: "train_number" })
                .select();


            if (error) {

                console.error(
                    `❌ Failed to upsert ${item.train_number}:`,
                    error.message
                );

                continue;
            }


            console.log(
                `✅ ${item.train_number} (${item.train_name || 'Details updated'}) saved to Supabase`
            );

        }

        catch (error) {

            console.error(
                `❌ Error saving ${item.train_number}:`,
                error.message
            );

        }
    }


    console.log(
        "\n✅ Supabase train table update completed"
    );
}


// ==========================================
// DISCOVER TRAINS
// ==========================================

async function discoverTrains() {

    console.log(
        "\n=========================================="
    );

    console.log(
        "🚉 TRAIN NUMBER DISCOVERY"
    );

    console.log(
        "=========================================="
    );


    console.log(
        `Testing ${CANDIDATE_TRAINS.length} candidate trains...\n`
    );


    const validTrainDetails = [];
    const validTrainNumbers = [];


    // ==========================================
    // TEST ALL CANDIDATE TRAINS
    // ==========================================

    for (
        const trainNumber of CANDIDATE_TRAINS
    ) {

        const testResult =
            await testTrain(trainNumber);


        if (testResult && testResult.train_number) {

            validTrainDetails.push(
                testResult
            );
            validTrainNumbers.push(
                testResult.train_number
            );

        }


        // Wait 1 second between API requests
        await new Promise(
            resolve =>
                setTimeout(resolve, 1000)
        );
    }


    // ==========================================
    // SHOW RESULTS
    // ==========================================

    console.log(
        "\n=========================================="
    );

    console.log(
        "✅ VALID TRAINS"
    );

    console.log(
        "=========================================="
    );


    if (!validTrainNumbers.length) {

        console.log(
            "❌ No valid trains found."
        );

        return;
    }


    console.log(
        validTrainNumbers.join(", ")
    );


    // ==========================================
    // CREATE DATA DIRECTORY
    // ==========================================

    const dataDirectory =
        path.dirname(
            ACTIVE_TRAINS_FILE
        );


    fs.mkdirSync(
        dataDirectory,
        {
            recursive: true
        }
    );


    // ==========================================
    // SAVE ACTIVE TRAINS JSON (MERGE WITH EXISTING)
    // ==========================================

    let existingList = [];
    if (fs.existsSync(ACTIVE_TRAINS_FILE)) {
        try {
            const raw = fs.readFileSync(ACTIVE_TRAINS_FILE, "utf8");
            existingList = JSON.parse(raw);
            if (!Array.isArray(existingList)) existingList = [];
        } catch (e) {
            existingList = [];
        }
    }

    const mergedTrains = [
        ...new Set([
            ...existingList.map(t => String(t).trim()),
            ...validTrainNumbers.map(t => String(t).trim())
        ])
    ].filter(Boolean);

    fs.writeFileSync(
        ACTIVE_TRAINS_FILE,
        JSON.stringify(
            mergedTrains,
            null,
            2
        ),
        "utf8"
    );


    console.log(
        "\n💾 Active trains saved automatically:"
    );

    console.log(
        ACTIVE_TRAINS_FILE
    );


    // ==========================================
    // DISPLAY ACTIVE TRAINS
    // ==========================================

    console.log(
        "\n📋 Active trains:"
    );


    validTrainDetails.forEach(
        (t, index) => {

            console.log(
                `   ${index + 1}. ${t.train_number} - ${t.train_name || 'Express'} (${t.source_station} -> ${t.destination_station})`
            );

        }
    );


    // ==========================================
    // UPDATE SUPABASE AUTOMATICALLY WITH DETAILS
    // ==========================================

    await saveTrainsToSupabase(
        validTrainDetails
    );


    // ==========================================
    // COMPLETED
    // ==========================================

    console.log(
        "\n=========================================="
    );

    console.log(
        "✅ DISCOVERY COMPLETED"
    );

    console.log(
        "==========================================\n"
    );
}


// ==========================================
// START DISCOVERY
// ==========================================

discoverTrains();