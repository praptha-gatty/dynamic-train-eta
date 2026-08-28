require("dotenv").config();

const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ==========================================
// CONFIGURATION
// ==========================================

const TRAIN_NUMBER = "12919";

const API_URL =
    `https://railradar.in/api/v1/trains/${TRAIN_NUMBER}/live`;


// ==========================================
// FETCH LIVE DATA
// ==========================================

async function fetchTrainData() {

    console.log(
        `🚆 Fetching train ${TRAIN_NUMBER}...`
    );

    const response = await axios.get(
        API_URL,
        {
            headers: {
                Authorization:
                    `Bearer ${process.env.RAILRADAR_API_KEY}`
            }
        }
    );

    return response.data;
}


// ==========================================
// SYNC TRAIN
// ==========================================

async function syncTrain(result) {

    const train =
        result.data?.train || {};

    console.log("\n🚆 TRAIN INFORMATION");
    console.log("----------------------");

    console.log(
        "Train number:",
        TRAIN_NUMBER
    );

    console.log(
        "Train name:",
        train.trainName || "Not provided"
    );

    console.log(
        "Train type:",
        train.trainType || "Not provided"
    );

    console.log(
        "Source:",
        train.sourceStation || "Not provided"
    );

    console.log(
        "Destination:",
        train.destinationStation || "Not provided"
    );


    const trainRecord = {

        train_number:
            TRAIN_NUMBER,

        train_name:
            train.trainName || null,

        train_type:
            train.trainType || null,

        source_station:
            train.sourceStation || null,

        destination_station:
            train.destinationStation || null
    };


    const {
        data,
        error
    } = await supabase
        .from("trains")
        .upsert(
            trainRecord,
            {
                onConflict: "train_number"
            }
        )
        .select();


    if (error) {

        console.error(
            "\n❌ Train sync failed:"
        );

        console.error(error);

        return false;
    }


    console.log(
        "✅ Train record synchronized"
    );

    return true;
}


// ==========================================
// SYNC STATIONS
// ==========================================

async function syncStations(route) {

    console.log(
        "\n🚉 SYNCING STATIONS"
    );

    console.log(
        "----------------------"
    );


    const stations = route
        .filter(station =>
            station.stationCode &&
            station.stationName
        )
        .map(station => ({

            station_code:
                station.stationCode,

            station_name:
                station.stationName,

            city:
                null,

            state:
                null,

            latitude:
                station.latitude ??
                null,

            longitude:
                station.longitude ??
                null
        }));


    // Remove duplicate station codes
    const uniqueStations =
        Array.from(
            new Map(
                stations.map(
                    station =>
                        [
                            station.station_code,
                            station
                        ]
                )
            ).values()
        );


    console.log(
        `📊 Stations found: ${uniqueStations.length}`
    );


    if (!uniqueStations.length) {

        console.log(
            "⚠️ No station records available"
        );

        return false;
    }


    const {
        data,
        error
    } = await supabase
        .from("stations")
        .upsert(
            uniqueStations,
            {
                onConflict: "station_code"
            }
        )
        .select();


    if (error) {

        console.error(
            "\n❌ Station sync failed:"
        );

        console.error(error);

        return false;
    }


    console.log(
        `✅ ${data.length} station records synchronized`
    );

    return true;
}


// ==========================================
// SYNC ROUTE
// ==========================================

async function syncRoutes(route) {

    console.log(
        "\n🛤️ SYNCING ROUTE"
    );

    console.log(
        "----------------------"
    );


    const routes =
        route
            .filter(station =>
                station.stationCode &&
                station.sequence !== undefined
            )
            .map(station => ({

                train_number:
                    TRAIN_NUMBER,

                station_code:
                    station.stationCode,

                station_sequence:
                    station.sequence,

                distance_from_source:
                    station.distance ??
                    null,

                scheduled_arrival:
                    station.scheduledArrival
                        ? station.scheduledArrival.substring(11, 19)
                        : null,

                scheduled_departure:
                    station.scheduledDeparture
                        ? station.scheduledDeparture.substring(11, 19)
                        : null,

                halt_minutes:
                    calculateHaltMinutes(
                        station
                    )
            }));


    console.log(
        `📊 Route records found: ${routes.length}`
    );


    if (!routes.length) {

        console.log(
            "⚠️ No route records available"
        );

        return false;
    }


    /*
     * IMPORTANT:
     *
     * routes does not currently have a unique
     * constraint in the database.
     *
     * Therefore we first remove the existing
     * route for this train and rebuild it.
     */

    const {
        error: deleteError
    } = await supabase
        .from("routes")
        .delete()
        .eq(
            "train_number",
            TRAIN_NUMBER
        );


    if (deleteError) {

        console.error(
            "\n❌ Could not clear old route:"
        );

        console.error(deleteError);

        return false;
    }


    const {
        data,
        error
    } = await supabase
        .from("routes")
        .insert(routes)
        .select();


    if (error) {

        console.error(
            "\n❌ Route sync failed:"
        );

        console.error(error);

        return false;
    }


    console.log(
        `✅ ${data.length} route records synchronized`
    );

    return true;
}


// ==========================================
// CALCULATE HALT TIME
// ==========================================

function calculateHaltMinutes(station) {

    if (
        !station.scheduledArrival ||
        !station.scheduledDeparture
    ) {
        return null;
    }


    const arrival =
        new Date(
            station.scheduledArrival
        );

    const departure =
        new Date(
            station.scheduledDeparture
        );


    const difference =
        (
            departure - arrival
        ) / 60000;


    if (
        difference < 0 ||
        difference > 1440
    ) {
        return null;
    }


    return Math.round(
        difference
    );
}


// ==========================================
// VERIFY DATA
// ==========================================

async function verifyData() {

    console.log(
        "\n🔎 VERIFYING DATABASE"
    );

    console.log(
        "======================"
    );


    // TRAIN

    const {
        data: trains,
        error: trainError
    } = await supabase
        .from("trains")
        .select("*")
        .eq(
            "train_number",
            TRAIN_NUMBER
        );


    if (trainError) {

        console.error(
            "❌ Train verification failed:",
            trainError
        );

    } else {

        console.log(
            `🚆 Trains: ${trains.length}`
        );
    }


    // STATIONS

    const {
        data: stations,
        error: stationError
    } = await supabase
        .from("stations")
        .select("*");


    if (stationError) {

        console.error(
            "❌ Station verification failed:",
            stationError
        );

    } else {

        console.log(
            `🚉 Total stations: ${stations.length}`
        );
    }


    // ROUTES

    const {
        data: routes,
        error: routeError
    } = await supabase
        .from("routes")
        .select("*")
        .eq(
            "train_number",
            TRAIN_NUMBER
        );


    if (routeError) {

        console.error(
            "❌ Route verification failed:",
            routeError
        );

    } else {

        console.log(
            `🛤️ Route records: ${routes.length}`
        );
    }
}


// ==========================================
// MAIN
// ==========================================

async function main() {

    try {

        console.log(
            "\n=========================================="
        );

        console.log(
            "🚆 TRAIN ROUTE DATABASE SYNC TEST"
        );

        console.log(
            "=========================================="
        );


        // Fetch API

        const result =
            await fetchTrainData();


        console.log(
            "✅ Live data received"
        );


        // Get route

        const route =
            result.data?.route || [];


        if (!route.length) {

            console.error(
                "❌ No route data found"
            );

            return;
        }


        console.log(
            `📍 Route contains ${route.length} records`
        );


        // Sync train

        await syncTrain(
            result
        );


        // Sync stations

        await syncStations(
            route
        );


        // Sync routes

        await syncRoutes(
            route
        );


        // Verify

        await verifyData();


        console.log(
            "\n=========================================="
        );

        console.log(
            "✅ ROUTE SYNC TEST COMPLETED"
        );

        console.log(
            "=========================================="
        );

    }

    catch (error) {

        console.error(
            "\n❌ Unexpected error:"
        );

        console.error(
            error.message
        );

    }
}


// ==========================================
// RUN
// ==========================================

main();