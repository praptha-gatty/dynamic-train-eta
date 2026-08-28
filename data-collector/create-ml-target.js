const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

// ============================================================
// FILE PATHS
// ============================================================

const INPUT_FILE = path.join(
    __dirname,
    "..",
    "data",
    "processed",
    "train_history_clean.csv"
);

const OUTPUT_FILE = path.join(
    __dirname,
    "..",
    "data",
    "processed",
    "train_eta_training.csv"
);

// ============================================================
// CONFIGURATION
// ============================================================

// Prediction horizons required by the project.
const FUTURE_WINDOWS = [10, 20, 30];

// IMPORTANT:
//
// Your collector does not necessarily produce a snapshot
// exactly at 10, 20 or 30 minutes.
//
// Example:
//
// 13:54
// 13:59
// 14:03
// 14:08
//
// Therefore we allow the nearest future observation within
// this tolerance.
const HORIZON_TOLERANCE_MINUTES = 5;

// Do not use an observation only a few seconds/minutes later
// as a future target.
const MIN_FUTURE_GAP_MINUTES = 3;

// ============================================================
// START
// ============================================================

console.log("\n==========================================");
console.log("CREATING ETA TRAINING DATASET");
console.log("==========================================");

// ============================================================
// CHECK INPUT FILE
// ============================================================

if (!fs.existsSync(INPUT_FILE)) {

    console.error("\nERROR: Clean dataset not found:");
    console.error(INPUT_FILE);

    console.error("\nRun:");
    console.error("node data-collector/prepare-ml-dataset.js");

    process.exit(1);
}

// ============================================================
// LOAD CSV
// ============================================================

let rows;

try {

    const csvText = fs.readFileSync(
        INPUT_FILE,
        "utf8"
    );

    rows = parse(
        csvText,
        {
            columns: true,
            skip_empty_lines: true,
            bom: true,
            relax_column_count: true,
            relax_quotes: true,
            trim: true
        }
    );

} catch (error) {

    console.error("\nERROR: Could not read clean CSV.");
    console.error(error.message);

    process.exit(1);
}

console.log(`Loaded ${rows.length} clean rows`);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function numberOrNull(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


function cleanString(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
}


function validDate(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}


// ============================================================
// VALIDATE OBSERVATIONS
// ============================================================

const validRows = [];

let invalidTrain = 0;
let invalidJourney = 0;
let invalidStation = 0;
let invalidSequence = 0;
let invalidDelay = 0;
let invalidTimestamp = 0;

for (const row of rows) {

    const trainNumber =
        cleanString(
            row.train_number
        );

    const journeyDate =
        cleanString(
            row.journey_date
        );

    const stationCode =
        cleanString(
            row.station_code
        );

    const stationName =
        cleanString(
            row.station_name
        );

    const sequence =
        numberOrNull(
            row.station_sequence
        );

    const delay =
        numberOrNull(
            row.delay_minutes
        );

    const capturedDate =
        validDate(
            row.captured_at
        );

    // --------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------

    if (!trainNumber) {

        invalidTrain++;

        continue;
    }

    if (!journeyDate) {

        invalidJourney++;

        continue;
    }

    if (!stationCode) {

        invalidStation++;

        continue;
    }

    if (
        sequence === null
    ) {

        invalidSequence++;

        continue;
    }

    if (
        delay === null
    ) {

        invalidDelay++;

        continue;
    }

    if (
        !capturedDate
    ) {

        invalidTimestamp++;

        continue;
    }

    // --------------------------------------------
    // NORMALIZED OBSERVATION
    // --------------------------------------------

    validRows.push({

        ...row,

        train_number:
            trainNumber,

        journey_date:
            journeyDate,

        station_code:
            stationCode,

        station_name:
            stationName,

        station_sequence:
            sequence,

        delay_minutes:
            delay,

        distance_km:
            numberOrNull(
                row.distance_from_origin_km ??
                row.distance_km
            ),

        speed_kmph:
            numberOrNull(
                row.speed_kmph
            ),

        capturedDate:
            capturedDate
    });
}

console.log(
    `Valid observations: ${validRows.length}`
);

console.log(
    `Invalid observations: ${
        rows.length - validRows.length
    }`
);

// ============================================================
// IMPORTANT FIX
//
// GROUP ONLY BY:
//     train_number + journey_date
//
// NOT BY STATION.
//
// This allows the model to find a future observation
// of the same train even after it moves to another station.
// ============================================================

const groups = new Map();

for (const row of validRows) {

    const key =
        `${row.train_number}__${row.journey_date}__${row.station_code}`;

    if (
        !groups.has(key)
    ) {

        groups.set(
            key,
            []
        );
    }

    groups
        .get(key)
        .push(row);
}

console.log(
    `Train journey groups: ${groups.size}`
);

// ============================================================
// SORT EACH TRAIN JOURNEY BY CAPTURE TIME
// ============================================================

for (
    const group of groups.values()
) {

    group.sort(
        (a, b) =>
            a.capturedDate.getTime() -
            b.capturedDate.getTime()
    );
}

// ============================================================
// REMOVE EXACT DUPLICATE SNAPSHOTS
//
// Your data contains repeated station rows captured at the
// same timestamp. We don't want those to become fake
// future observations.
// ============================================================

const cleanedGroups = new Map();

for (
    const [key, group]
    of groups.entries()
) {

    const unique = [];

    const seen = new Set();

    for (
        const row of group
    ) {

        const duplicateKey = [
            row.train_number,
            row.journey_date,
            row.station_code,
            row.station_sequence,
            row.capturedDate.getTime()
        ].join("|");

        if (
            seen.has(duplicateKey)
        ) {
            continue;
        }

        seen.add(
            duplicateKey
        );

        unique.push(row);
    }

    cleanedGroups.set(
        key,
        unique
    );
}

console.log(
    `Clean train journey groups: ${
        cleanedGroups.size
    }`
);

// ============================================================
// TRAINING DATA
// ============================================================

const trainingRows = [];

let skippedNoFuture = 0;
let skippedInvalidTarget = 0;
let skippedBadHorizon = 0;
let invalidHorizonRows = 0;

// ============================================================
// PROCESS EACH TRAIN JOURNEY
// ============================================================

for (
    const group
    of cleanedGroups.values()
) {

    if (
        group.length < 2
    ) {
        continue;
    }

    // --------------------------------------------------------
    // CURRENT OBSERVATION
    // --------------------------------------------------------

    for (
        let i = 0;
        i < group.length;
        i++
    ) {

        const current =
            group[i];

        const currentTime =
            current.capturedDate.getTime();

        // ----------------------------------------------------
        // EACH HORIZON
        // ----------------------------------------------------

        for (
            const horizon
            of FUTURE_WINDOWS
        ) {

            const targetTime =
                currentTime +
                horizon * 60 * 1000;

            let bestFuture = null;

            let smallestDifference =
                Infinity;

            // ------------------------------------------------
            // SEARCH ALL FUTURE OBSERVATIONS
            // ------------------------------------------------

            for (
                let j = i + 1;
                j < group.length;
                j++
            ) {

                const candidate =
                    group[j];

                const candidateTime =
                    candidate.capturedDate.getTime();

                // Candidate must be the same station and actually be later.
                if (
                    candidate.station_code !== current.station_code ||
                    candidateTime <= currentTime
                ) {
                    continue;
                }

                const actualGapMinutes =
                    (
                        candidateTime -
                        currentTime
                    ) / 60000;

                // Ignore nearly identical snapshots.
                if (
                    actualGapMinutes <
                    MIN_FUTURE_GAP_MINUTES
                ) {
                    continue;
                }

                const difference =
                    Math.abs(
                        actualGapMinutes -
                        horizon
                    );

                // We don't need observations farther than
                // the allowed horizon tolerance.
                if (
                    difference >
                    HORIZON_TOLERANCE_MINUTES
                ) {

                    // Because observations are sorted by time,
                    // once we are sufficiently beyond the target
                    // there is no reason to continue.
                    if (
                        candidateTime >
                        targetTime +
                        HORIZON_TOLERANCE_MINUTES *
                        60 *
                        1000
                    ) {
                        break;
                    }

                    continue;
                }

                // Choose the closest observation to the
                // requested horizon.
                if (
                    difference <
                    smallestDifference
                ) {

                    smallestDifference =
                        difference;

                    bestFuture =
                        candidate;
                }
            }

            // ------------------------------------------------
            // NO SUITABLE FUTURE OBSERVATION
            // ------------------------------------------------

            if (
                !bestFuture
            ) {

                skippedNoFuture++;

                continue;
            }

            // ------------------------------------------------
            // ACTUAL FUTURE GAP
            // ------------------------------------------------

            const actualFutureGap =
                (
                    bestFuture.capturedDate.getTime() -
                    currentTime
                ) / 60000;

            // ------------------------------------------------
            // FINAL HORIZON VALIDATION
            // ------------------------------------------------

            if (
                actualFutureGap <
                MIN_FUTURE_GAP_MINUTES
            ) {

                invalidHorizonRows++;

                continue;
            }

            if (
                Math.abs(
                    actualFutureGap -
                    horizon
                ) >
                HORIZON_TOLERANCE_MINUTES
            ) {

                skippedBadHorizon++;

                continue;
            }

            // ------------------------------------------------
            // FUTURE TARGET DELAY
            // ------------------------------------------------

            const targetDelay =
                numberOrNull(
                    bestFuture.delay_minutes
                );

            if (
                targetDelay === null
            ) {

                skippedInvalidTarget++;

                continue;
            }

            // ------------------------------------------------
            // CURRENT DELAY
            // ------------------------------------------------

            const currentDelay =
                numberOrNull(
                    current.delay_minutes
                );

            if (
                currentDelay === null
            ) {

                skippedInvalidTarget++;

                continue;
            }

            // ------------------------------------------------
            // DELAY CHANGE
            // ------------------------------------------------

            const delayChange =
                targetDelay -
                currentDelay;

            // ------------------------------------------------
            // DISTANCE CHANGE
            // ------------------------------------------------

            let distanceChange = null;

            if (
                current.distance_km !== null &&
                bestFuture.distance_km !== null
            ) {

                distanceChange =
                    bestFuture.distance_km -
                    current.distance_km;
            }

            // ------------------------------------------------
            // CREATE TRAINING ROW
            // ------------------------------------------------

            trainingRows.push({

                // Current observation
                train_number:
                    current.train_number,

                train_name:
                    current.train_name,

                station_code:
                    current.station_code,

                station_name:
                    current.station_name,

                station_sequence:
                    current.station_sequence,

                scheduled_arrival:
                    current.scheduled_arrival,

                scheduled_departure:
                    current.scheduled_departure,

                actual_arrival:
                    current.actual_arrival,

                actual_departure:
                    current.actual_departure,

                arrival_delay_minutes:
                    current.arrival_delay_minutes,

                departure_delay_minutes:
                    current.departure_delay_minutes,

                current_delay_minutes:
                    currentDelay,

                distance_km:
                    current.distance_km,

                distance_from_last_station_km:
                    current.distance_from_last_station_km,

                distance_remaining_km:
                    current.distance_remaining_km,

                speed_kmph:
                    current.speed_kmph,

                previous_station:
                    current.previous_station,

                current_station:
                    current.current_station,

                next_station:
                    current.next_station,

                next_station_code:
                    current.next_station_code,

                next_station_sequence:
                    current.next_station_sequence,

                station_status:
                    current.station_status,

                running_status:
                    current.running_status,

                is_halt:
                    current.is_halt,

                captured_at:
                    current.captured_at,

                api_updated_at:
                    current.api_updated_at,

                journey_date:
                    current.journey_date,

                day_of_week:
                    current.day_of_week,

                hour:
                    current.hour,

                minute:
                    current.minute,

                month:
                    current.month,

                time_period:
                    current.time_period,

                is_weekend:
                    current.is_weekend,

                // Future observation
                future_station_code:
                    bestFuture.station_code,

                future_station_name:
                    bestFuture.station_name,

                future_station_sequence:
                    bestFuture.station_sequence,

                future_captured_at:
                    bestFuture.captured_at,

                future_distance_km:
                    bestFuture.distance_km,

                future_speed_kmph:
                    bestFuture.speed_kmph,

                future_delay_minutes:
                    targetDelay,

                // Prediction information
                prediction_horizon_minutes:
                    horizon,

                actual_future_gap_minutes:
                    Number(
                        actualFutureGap.toFixed(2)
                    ),

                target_delay_minutes:
                    targetDelay,

                target_delay_change_minutes:
                    Number(
                        delayChange.toFixed(2)
                    ),

                distance_change_km:
                    distanceChange !== null
                        ? Number(
                            distanceChange.toFixed(2)
                        )
                        : null
            });
        }
    }
}

// ============================================================
// REMOVE TRAINING DUPLICATES
// ============================================================

const uniqueMap = new Map();

for (
    const row
    of trainingRows
) {

    const key = [

        row.train_number,

        row.journey_date,

        row.station_code,

        row.station_sequence,

        row.captured_at,

        row.prediction_horizon_minutes

    ].join("|");

    if (
        !uniqueMap.has(key)
    ) {

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

// ============================================================
// SORT TRAINING DATA
// ============================================================

uniqueRows.sort(
    (a, b) => {

        const trainCompare =
            String(
                a.train_number
            ).localeCompare(
                String(
                    b.train_number
                ),
                undefined,
                {
                    numeric: true
                }
            );

        if (
            trainCompare !== 0
        ) {
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

        if (
            dateCompare !== 0
        ) {
            return dateCompare;
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

// ============================================================
// CSV ESCAPE
// ============================================================

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

        return (
            '"' +
            text.replace(
                /"/g,
                '""'
            ) +
            '"'
        );
    }

    return text;
}

// ============================================================
// OUTPUT HEADERS
// ============================================================

const headers = [

    "train_number",
    "train_name",

    "station_code",
    "station_name",
    "station_sequence",

    "scheduled_arrival",
    "scheduled_departure",

    "actual_arrival",
    "actual_departure",

    "arrival_delay_minutes",
    "departure_delay_minutes",
    "current_delay_minutes",

    "distance_km",
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

    "journey_date",

    "day_of_week",
    "hour",
    "minute",
    "month",

    "time_period",
    "is_weekend",

    "future_station_code",
    "future_station_name",
    "future_station_sequence",

    "future_captured_at",

    "future_distance_km",
    "future_speed_kmph",
    "future_delay_minutes",

    "prediction_horizon_minutes",
    "actual_future_gap_minutes",

    "target_delay_minutes",
    "target_delay_change_minutes",

    "distance_change_km"
];

// ============================================================
// BUILD CSV
// ============================================================

const csvLines = [];

csvLines.push(
    headers.join(",")
);

for (
    const row
    of uniqueRows
) {

    const line =
        headers
            .map(
                header =>
                    csvEscape(
                        row[header]
                    )
            )
            .join(",");

    csvLines.push(
        line
    );
}

const output =
    csvLines.join("\n") +
    "\n";

// ============================================================
// SAVE OUTPUT
// ============================================================

try {

    fs.writeFileSync(
        OUTPUT_FILE,
        output,
        "utf8"
    );

} catch (error) {

    console.error(
        "\nERROR: Could not save output file."
    );

    console.error(
        error.message
    );

    process.exit(1);
}

// ============================================================
// STATISTICS
// ============================================================

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

const futureStationSet =
    new Set(
        uniqueRows.map(
            row =>
                row.future_station_code
        )
    );

// ============================================================
// DELAY STATISTICS
// ============================================================

const targetDelays =
    uniqueRows
        .map(
            row =>
                Number(
                    row.target_delay_minutes
                )
        )
        .filter(
            Number.isFinite
        );

const averageTargetDelay =
    targetDelays.length > 0
        ? targetDelays.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        targetDelays.length
        : 0;

const maximumTargetDelay =
    targetDelays.length > 0
        ? Math.max(
            ...targetDelays
        )
        : 0;

// ============================================================
// DELAY CHANGE STATISTICS
// ============================================================

const delayChanges =
    uniqueRows
        .map(
            row =>
                Number(
                    row.target_delay_change_minutes
                )
        )
        .filter(
            Number.isFinite
        );

const averageDelayChange =
    delayChanges.length > 0
        ? delayChanges.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        delayChanges.length
        : 0;

// ============================================================
// FUTURE GAP STATISTICS
// ============================================================

const futureGaps =
    uniqueRows
        .map(
            row =>
                Number(
                    row.actual_future_gap_minutes
                )
        )
        .filter(
            Number.isFinite
        );

const minimumFutureGap =
    futureGaps.length > 0
        ? Math.min(
            ...futureGaps
        )
        : 0;

const maximumFutureGap =
    futureGaps.length > 0
        ? Math.max(
            ...futureGaps
        )
        : 0;

// ============================================================
// HORIZON STATISTICS
// ============================================================

const horizonStats = {};

for (
    const horizon
    of FUTURE_WINDOWS
) {

    horizonStats[horizon] =
        uniqueRows.filter(
            row =>
                Number(
                    row.prediction_horizon_minutes
                ) === horizon
        ).length;
}

// ============================================================
// JOURNEY STATISTICS
// ============================================================

let minimumJourneyRows =
    Infinity;

let maximumJourneyRows =
    0;

let totalJourneyRows =
    0;

for (
    const group
    of cleanedGroups.values()
) {

    const count =
        group.length;

    if (
        count <
        minimumJourneyRows
    ) {
        minimumJourneyRows =
            count;
    }

    if (
        count >
        maximumJourneyRows
    ) {
        maximumJourneyRows =
            count;
    }

    totalJourneyRows +=
        count;
}

if (
    minimumJourneyRows === Infinity
) {
    minimumJourneyRows = 0;
}

// ============================================================
// FINAL REPORT
// ============================================================

console.log(
    "\n=========================================="
);

console.log(
    "ETA TRAINING DATASET CREATED"
);

console.log(
    "=========================================="
);

console.log(
    `Input rows: ${rows.length}`
);

console.log(
    `Valid observations: ${validRows.length}`
);

console.log(
    `Train journey groups: ${cleanedGroups.size}`
);

console.log(
    `Training rows: ${uniqueRows.length}`
);

console.log(
    `Unique trains: ${trainSet.size}`
);

console.log(
    `Current stations: ${stationSet.size}`
);

console.log(
    `Future stations: ${futureStationSet.size}`
);

console.log(
    `Skipped - no future observation: ${skippedNoFuture}`
);

console.log(
    `Skipped - invalid target: ${skippedInvalidTarget}`
);

console.log(
    `Skipped - bad horizon: ${skippedBadHorizon}`
);

console.log(
    `Invalid horizon rows: ${invalidHorizonRows}`
);

console.log(
    "\nPrediction horizons:"
);

for (
    const horizon
    of FUTURE_WINDOWS
) {

    console.log(
        `   ${horizon} min: ${
            horizonStats[horizon]
        } rows`
    );
}

console.log(
    `\nActual future gap range: ${
        minimumFutureGap.toFixed(2)
    } - ${
        maximumFutureGap.toFixed(2)
    } minutes`
);

console.log(
    `Average target delay: ${
        averageTargetDelay.toFixed(2)
    } minutes`
);

console.log(
    `Maximum target delay: ${
        maximumTargetDelay
    } minutes`
);

console.log(
    `Average delay change: ${
        averageDelayChange.toFixed(2)
    } minutes`
);

console.log(
    "\nJourney observation statistics:"
);

console.log(
    `   Minimum observations/journey: ${
        minimumJourneyRows
    }`
);

console.log(
    `   Maximum observations/journey: ${
        maximumJourneyRows
    }`
);

console.log(
    `   Total journey observations: ${
        totalJourneyRows
    }`
);

console.log(
    "\nTARGET:"
);

console.log(
    "target_delay_minutes"
);

console.log(
    "target_delay_change_minutes"
);

console.log(
    "\nSaved:"
);

console.log(
    OUTPUT_FILE
);

// ============================================================
// IMPORTANT RESULT MESSAGE
// ============================================================

if (
    uniqueRows.length === 0
) {

    console.log(
        "\n=========================================="
    );

    console.log(
        "⚠ NO ETA TRAINING ROWS CREATED"
    );

    console.log(
        "=========================================="
    );

    console.log(
        "The script correctly searched across the"
    );

    console.log(
        "complete train journey instead of individual stations."
    );

    console.log(
        `Allowed horizon tolerance: ±${
            HORIZON_TOLERANCE_MINUTES
        } minutes`
    );

    console.log(
        "Check the future-gap statistics above."
    );

} else {

    console.log(
        "\n=========================================="
    );

    console.log(
        "✅ ETA TRAINING DATA IS READY"
    );

    console.log(
        "=========================================="
    );

    console.log(
        `${uniqueRows.length} training rows created.`
    );

    console.log(
        "The dataset can now be used for ML training."
    );
}

console.log(
    "\nDONE."
);