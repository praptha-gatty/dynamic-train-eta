require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const REPORT_DIR =
    path.join(__dirname, "..", "data", "reports");

fs.mkdirSync(REPORT_DIR, { recursive: true });

async function generateReport() {

    console.log("📊 Generating dataset quality report...\n");

    // ==========================================
    // FETCH DATA
    // ==========================================

    const { data, error } = await supabase
        .from("train_history")
        .select("*");

    if (error) {

        console.error(
            "❌ Unable to fetch train_history"
        );

        console.error(error);

        return;
    }

    if (!data || data.length === 0) {

        console.log(
            "⚠️ train_history is empty."
        );

        return;
    }

    console.log(
        `✅ Loaded ${data.length} records\n`
    );


    // ==========================================
    // BASIC STATISTICS
    // ==========================================

    const totalRows = data.length;

    const uniqueTrains =
        new Set(
            data
                .map(row => row.train_number)
                .filter(Boolean)
        ).size;

    const uniqueStations =
        new Set(
            data
                .map(row => row.current_station)
                .filter(Boolean)
        ).size;

    const uniqueTimestamps =
        new Set(
            data
                .map(row => row.captured_at)
                .filter(Boolean)
        ).size;

    const dates =
        data
            .map(row => new Date(row.captured_at))
            .filter(date => !isNaN(date));

    const earliestDate =
        dates.length
            ? new Date(
                Math.min(...dates)
            ).toISOString()
            : null;

    const latestDate =
        dates.length
            ? new Date(
                Math.max(...dates)
            ).toISOString()
            : null;


    // ==========================================
    // MISSING VALUES
    // ==========================================

    const columns = [
        "train_number",
        "current_station",
        "scheduled_arrival",
        "actual_arrival",
        "scheduled_departure",
        "actual_departure",
        "delay_minutes",
        "latitude",
        "longitude",
        "speed_kmph",
        "distance_remaining_km",
        "running_status",
        "captured_at"
    ];

    const missingValues = {};

    columns.forEach(column => {

        const missing =
            data.filter(row =>
                row[column] === null ||
                row[column] === undefined ||
                row[column] === ""
            ).length;

        missingValues[column] = {
            missing_count: missing,

            missing_percentage:
                Number(
                    ((missing / totalRows) * 100)
                    .toFixed(2)
                )
        };
    });


    // ==========================================
    // DUPLICATES
    // ==========================================

    const seen = new Set();

    let duplicateCount = 0;

    data.forEach(row => {

        const key =
            [
                row.train_number,
                row.current_station,
                row.scheduled_arrival,
                row.actual_arrival,
                row.captured_at
            ].join("|");

        if (seen.has(key)) {

            duplicateCount++;

        } else {

            seen.add(key);
        }
    });


    // ==========================================
    // DELAY STATISTICS
    // ==========================================

    const delays =
        data
            .map(row => Number(row.delay_minutes))
            .filter(value => Number.isFinite(value));

    const averageDelay =
        delays.length
            ? delays.reduce(
                (sum, value) => sum + value,
                0
            ) / delays.length
            : null;

    const maximumDelay =
        delays.length
            ? Math.max(...delays)
            : null;

    const minimumDelay =
        delays.length
            ? Math.min(...delays)
            : null;


    // ==========================================
    // SPEED STATISTICS
    // ==========================================

    const speeds =
        data
            .map(row => Number(row.speed_kmph))
            .filter(value => Number.isFinite(value));

    const averageSpeed =
        speeds.length
            ? speeds.reduce(
                (sum, value) => sum + value,
                0
            ) / speeds.length
            : null;

    const maximumSpeed =
        speeds.length
            ? Math.max(...speeds)
            : null;


    // ==========================================
    // DATA QUALITY REPORT
    // ==========================================

    const report = {

        generated_at:
            new Date().toISOString(),

        dataset: {

            table:
                "train_history",

            total_rows:
                totalRows,

            unique_trains:
                uniqueTrains,

            unique_stations:
                uniqueStations,

            unique_collection_timestamps:
                uniqueTimestamps,

            earliest_capture:
                earliestDate,

            latest_capture:
                latestDate
        },

        duplicates: {

            duplicate_rows:
                duplicateCount,

            duplicate_percentage:
                Number(
                    (
                        (duplicateCount / totalRows)
                        * 100
                    ).toFixed(2)
                )
        },

        delay_statistics: {

            records_with_delay:
                delays.length,

            average_delay_minutes:
                averageDelay !== null
                    ? Number(
                        averageDelay.toFixed(2)
                    )
                    : null,

            minimum_delay_minutes:
                minimumDelay,

            maximum_delay_minutes:
                maximumDelay
        },

        speed_statistics: {

            records_with_speed:
                speeds.length,

            average_speed_kmph:
                averageSpeed !== null
                    ? Number(
                        averageSpeed.toFixed(2)
                    )
                    : null,

            maximum_speed_kmph:
                maximumSpeed
        },

        missing_values:
            missingValues
    };


    // ==========================================
    // SAVE JSON REPORT
    // ==========================================

    const jsonPath =
        path.join(
            REPORT_DIR,
            "dataset_statistics.json"
        );

    fs.writeFileSync(
        jsonPath,
        JSON.stringify(
            report,
            null,
            2
        ),
        "utf8"
    );


    // ==========================================
    // DISPLAY REPORT
    // ==========================================

    console.log(
        "================================"
    );

    console.log(
        "📊 DATASET STATISTICS"
    );

    console.log(
        "================================"
    );

    console.log(
        `Total rows: ${totalRows}`
    );

    console.log(
        `Unique trains: ${uniqueTrains}`
    );

    console.log(
        `Unique stations: ${uniqueStations}`
    );

    console.log(
        `Collection timestamps: ${uniqueTimestamps}`
    );

    console.log(
        `Earliest capture: ${earliestDate}`
    );

    console.log(
        `Latest capture: ${latestDate}`
    );

    console.log(
        `Duplicate rows: ${duplicateCount}`
    );

    console.log(
        `Average delay: ${averageDelay?.toFixed(2) ?? "N/A"} minutes`
    );

    console.log(
        `Maximum delay: ${maximumDelay ?? "N/A"} minutes`
    );

    console.log(
        `Average speed: ${averageSpeed?.toFixed(2) ?? "N/A"} km/h`
    );

    console.log(
        `Maximum speed: ${maximumSpeed ?? "N/A"} km/h`
    );

    console.log(
        "\n💾 Report saved:"
    );

    console.log(
        jsonPath
    );
}

generateReport();