require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

// ==========================================
// FILES
// ==========================================

const INPUT_FILE = path.join(
    __dirname,
    "..",
    "data",
    "processed",
    "train_history_ml.csv"
);

const OUTPUT_FILE = path.join(
    __dirname,
    "..",
    "data",
    "processed",
    "train_history_clean.csv"
);

// ==========================================
// EXPECTED INPUT HEADERS
// ==========================================

const REQUIRED_HEADERS = [
    "train_number",
    "train_name",
    "journey_date",
    "station_sequence",
    "station_code",
    "station_name",
    "scheduled_arrival",
    "actual_arrival",
    "scheduled_departure",
    "actual_departure",
    "arrival_delay_minutes",
    "departure_delay_minutes",
    "delay_minutes",
    "distance_from_origin_km",
    "distance_from_last_station_km",
    "distance_remaining_km",
    "speed_kmph",
    "previous_station",
    "current_station",
    "next_station",
    "next_station_code",
    "next_station_sequence",
    "station_status",
    "running_status",
    "is_halt",
    "captured_at",
    "api_updated_at"
];

// ==========================================
// START
// ==========================================

console.log("\n==========================================");
console.log("📊 PREPARING ML DATASET");
console.log("==========================================");

if (!fs.existsSync(INPUT_FILE)) {

    console.error("❌ ML input dataset not found:");
    console.error(INPUT_FILE);

    process.exit(1);
}

// ==========================================
// LOAD CSV
// ==========================================

const csvText = fs.readFileSync(
    INPUT_FILE,
    "utf8"
);

let rows;

try {

    rows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_column_count: false,
        trim: true
    });

} catch (error) {

    console.error("\n❌ CSV parsing failed.");
    console.error(error.message);

    console.error(
        "\nThis usually means train_history_ml.csv contains mixed schemas."
    );

    console.error(
        "Delete the old train_history_ml.csv and run collector.js again."
    );

    process.exit(1);
}

console.log(
    `📥 Loaded ${rows.length} raw rows`
);

// ==========================================
// VALIDATE HEADER
// ==========================================

const actualHeaders =
    Object.keys(rows[0] || {});

const missingHeaders =
    REQUIRED_HEADERS.filter(
        header =>
            !actualHeaders.includes(header)
    );

if (missingHeaders.length) {

    console.error(
        "\n❌ Input CSV has an incompatible schema."
    );

    console.error(
        "\nMissing columns:"
    );

    console.error(
        missingHeaders.join(", ")
    );

    process.exit(1);
}

// ==========================================
// CLEAN DATA
// ==========================================

const cleanedRows = [];

let invalidRows = 0;

for (const row of rows) {

    const trainNumber =
        String(
            row.train_number || ""
        ).trim();

    const stationCode =
        String(
            row.station_code || ""
        ).trim();

    const journeyDate =
        String(
            row.journey_date || ""
        ).trim();

    const sequence =
        Number(
            row.station_sequence
        );

    const delay =
        Number(
            row.delay_minutes
        );

    const distance =
        Number(
            row.distance_from_origin_km
        );

    const distanceFromLast =
        Number(
            row.distance_from_last_station_km
        );

    const distanceRemaining =
        Number(
            row.distance_remaining_km
        );

    const speed =
        Number(
            row.speed_kmph
        );

    const capturedAt =
        new Date(
            row.captured_at
        );

    // ======================================
    // VALIDATION
    // ======================================

    if (!trainNumber) {
        invalidRows++;
        continue;
    }

    if (!stationCode) {
        invalidRows++;
        continue;
    }

    if (!journeyDate) {
        invalidRows++;
        continue;
    }

    if (!Number.isFinite(sequence)) {
        invalidRows++;
        continue;
    }

    if (!Number.isFinite(delay)) {
        invalidRows++;
        continue;
    }

    if (
        Number.isNaN(
            capturedAt.getTime()
        )
    ) {
        invalidRows++;
        continue;
    }

    // ======================================
    // TIME FEATURES
    // ======================================

    const hour =
        capturedAt.getUTCHours();

    const minute =
        capturedAt.getUTCMinutes();

    const month =
        capturedAt.getUTCMonth() + 1;

    const dayOfWeek =
        capturedAt.getUTCDay();

    const isWeekend =
        dayOfWeek === 0 ||
        dayOfWeek === 6;

    let timePeriod;

    if (hour < 6) {

        timePeriod = "night";

    } else if (hour < 12) {

        timePeriod = "morning";

    } else if (hour < 18) {

        timePeriod = "afternoon";

    } else {

        timePeriod = "evening";
    }

    // ======================================
    // CLEAN RECORD
    // ======================================

    cleanedRows.push({

        train_number:
            trainNumber,

        train_name:
            row.train_name || null,

        journey_date:
            journeyDate,

        station_sequence:
            sequence,

        station_code:
            stationCode,

        station_name:
            row.station_name || null,

        scheduled_arrival:
            row.scheduled_arrival || null,

        actual_arrival:
            row.actual_arrival || null,

        scheduled_departure:
            row.scheduled_departure || null,

        actual_departure:
            row.actual_departure || null,

        arrival_delay_minutes:
            Number.isFinite(
                Number(row.arrival_delay_minutes)
            )
                ? Number(row.arrival_delay_minutes)
                : null,

        departure_delay_minutes:
            Number.isFinite(
                Number(row.departure_delay_minutes)
            )
                ? Number(row.departure_delay_minutes)
                : null,

        delay_minutes:
            delay,

        distance_from_origin_km:
            Number.isFinite(distance)
                ? distance
                : null,

        distance_from_last_station_km:
            Number.isFinite(distanceFromLast)
                ? distanceFromLast
                : null,

        distance_remaining_km:
            Number.isFinite(distanceRemaining)
                ? distanceRemaining
                : null,

        speed_kmph:
            Number.isFinite(speed)
                ? speed
                : null,

        previous_station:
            row.previous_station || null,

        current_station:
            row.current_station || null,

        next_station:
            row.next_station || null,

        next_station_code:
            row.next_station_code || null,

        next_station_sequence:
            Number.isFinite(
                Number(row.next_station_sequence)
            )
                ? Number(row.next_station_sequence)
                : null,

        station_status:
            row.station_status || null,

        running_status:
            row.running_status || null,

        is_halt:
            row.is_halt === "true" ||
            row.is_halt === true,

        captured_at:
            row.captured_at,

        api_updated_at:
            row.api_updated_at || null,

        day_of_week:
            dayOfWeek,

        hour:
            hour,

        minute:
            minute,

        month:
            month,

        time_period:
            timePeriod,

        is_weekend:
            isWeekend
    });
}

// ==========================================
// REMOVE DUPLICATES
// ==========================================

const uniqueMap =
    new Map();

for (const row of cleanedRows) {

    const key = [

        row.train_number,

        row.journey_date,

        row.station_code,

        row.station_sequence,

        row.captured_at

    ].join("|");

    if (!uniqueMap.has(key)) {

        uniqueMap.set(
            key,
            row
        );
    }
}

const uniqueRows =
    Array.from(
        uniqueMap.values()
    );

// ==========================================
// SORT
// ==========================================

uniqueRows.sort(
    (a, b) => {

        const trainCompare =
            String(
                a.train_number
            ).localeCompare(
                String(
                    b.train_number
                )
            );

        if (trainCompare !== 0) {
            return trainCompare;
        }

        const dateCompare =
            String(
                a.journey_date
            ).localeCompare(
                String(
                    b.journey_date
                )
            );

        if (dateCompare !== 0) {
            return dateCompare;
        }

        const sequenceCompare =
            Number(
                a.station_sequence
            ) -
            Number(
                b.station_sequence
            );

        if (sequenceCompare !== 0) {
            return sequenceCompare;
        }

        return (
            new Date(
                a.captured_at
            ).getTime() -
            new Date(
                b.captured_at
            ).getTime()
        );
    }
);

// ==========================================
// CSV ESCAPE
// ==========================================

function csvEscape(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    const text =
        String(value);

    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {

        return `"${text.replace(
            /"/g,
            '""'
        )}"`;
    }

    return text;
}

// ==========================================
// OUTPUT HEADERS
// ==========================================

const headers = [

    "train_number",
    "train_name",
    "journey_date",

    "station_sequence",
    "station_code",
    "station_name",

    "scheduled_arrival",
    "actual_arrival",

    "scheduled_departure",
    "actual_departure",

    "arrival_delay_minutes",
    "departure_delay_minutes",
    "delay_minutes",

    "distance_from_origin_km",
    "distance_from_last_station_km",
    "distance_remaining_km",

    "speed_kmph",

    "previous_station",
    "current_station",

    "next_station",
    "next_station_code",
    "next_station_sequence",

    "station_status",
    "running_status",
    "is_halt",

    "captured_at",
    "api_updated_at",

    "day_of_week",
    "hour",
    "minute",
    "month",
    "time_period",
    "is_weekend"
];

// ==========================================
// CREATE OUTPUT
// ==========================================

const csvRows =
    uniqueRows.map(row =>
        headers
            .map(
                header =>
                    csvEscape(
                        row[header]
                    )
            )
            .join(",")
    );

const output =
    headers.join(",") +
    "\n" +
    csvRows.join("\n") +
    "\n";

// ==========================================
// SAVE
// ==========================================

fs.writeFileSync(
    OUTPUT_FILE,
    output,
    "utf8"
);

// ==========================================
// STATISTICS
// ==========================================

const trainSet =
    new Set(
        uniqueRows.map(
            row =>
                row.train_number
        )
    );

const stationSet =
    new Set(
        uniqueRows.map(
            row =>
                row.station_code
        )
    );

const dateSet =
    new Set(
        uniqueRows.map(
            row =>
                row.journey_date
        )
    );

const delays =
    uniqueRows
        .map(
            row =>
                Number(
                    row.delay_minutes
                )
        )
        .filter(
            Number.isFinite
        );

const averageDelay =
    delays.length
        ? delays.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / delays.length
        : 0;

const maximumDelay =
    delays.length
        ? Math.max(...delays)
        : 0;

// ==========================================
// TRAIN DISTRIBUTION
// ==========================================

const trainCounts = {};

for (const row of uniqueRows) {

    trainCounts[row.train_number] =
        (
            trainCounts[row.train_number] ||
            0
        ) + 1;
}

// ==========================================
// FINAL REPORT
// ==========================================

console.log(
    "\n=========================================="
);

console.log(
    "✅ ML DATASET READY"
);

console.log(
    "=========================================="
);

console.log(
    `Raw rows: ${rows.length}`
);

console.log(
    `Valid rows: ${cleanedRows.length}`
);

console.log(
    `Clean rows: ${uniqueRows.length}`
);

console.log(
    `Removed duplicates: ${
        cleanedRows.length -
        uniqueRows.length
    }`
);

console.log(
    `Invalid rows: ${invalidRows}`
);

console.log(
    `Unique trains: ${trainSet.size}`
);

console.log(
    `Unique stations: ${stationSet.size}`
);

console.log(
    `Journey dates: ${dateSet.size}`
);

console.log(
    `Average delay: ${
        averageDelay.toFixed(2)
    } minutes`
);

console.log(
    `Maximum delay: ${
        maximumDelay
    } minutes`
);

console.log(
    "\n🚆 TRAIN DISTRIBUTION:"
);

for (
    const train of
    Object.keys(trainCounts).sort()
) {

    console.log(
        `   ${train}: ${trainCounts[train]} rows`
    );
}

console.log(
    "\n💾 Clean dataset saved:"
);

console.log(
    OUTPUT_FILE
);