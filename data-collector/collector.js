const path = require("path");
const fs = require("fs");
const axios = require("axios");
const dotenv = require("dotenv");
const stationMaster = require("./stationMaster");

// ============================================================
// LOAD ENVIRONMENT
// ============================================================

dotenv.config({
    path: path.join(__dirname, "..", ".env")
});

// IMPORTANT: package name is lowercase
const { createClient } = require("@supabase/supabase-js");

// ============================================================
// ENVIRONMENT VALIDATION
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const RAILRADAR_API_KEY = process.env.RAILRADAR_API_KEY;

if (!SUPABASE_URL) {
    console.error("❌ SUPABASE_URL is missing from .env");
    process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
    console.error("❌ SUPABASE_ANON_KEY is missing from .env");
    process.exit(1);
}

if (!RAILRADAR_API_KEY) {
    console.error("❌ RAILRADAR_API_KEY is missing from .env");
    process.exit(1);
}

// ============================================================
// SUPABASE
// ============================================================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// ============================================================
// CONFIGURATION
// ============================================================

// Collect every 5 minutes
const COLLECTION_INTERVAL = 5 * 60 * 1000;

// Wait between trains
const BETWEEN_TRAIN_DELAY = 1500;

// ============================================================
// FILE PATHS
// ============================================================

const ACTIVE_TRAINS_FILE = path.join(
    __dirname,
    "..",
    "data",
    "active-trains.json"
);

const RAW_DIR = path.join(
    __dirname,
    "..",
    "data",
    "raw"
);

const PROCESSED_DIR = path.join(
    __dirname,
    "..",
    "data",
    "processed"
);

const ML_CSV = path.join(
    PROCESSED_DIR,
    "train_history_ml.csv"
);

// ============================================================
// CREATE DIRECTORIES
// ============================================================

fs.mkdirSync(
    RAW_DIR,
    {
        recursive: true
    }
);

fs.mkdirSync(
    PROCESSED_DIR,
    {
        recursive: true
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

    const text = String(value);

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

// ============================================================
// LOAD ACTIVE TRAINS
// ============================================================

function loadActiveTrains() {

    if (!fs.existsSync(ACTIVE_TRAINS_FILE)) {

        console.error(
            "❌ active-trains.json not found."
        );

        console.error(
            "Run:"
        );

        console.error(
            "node data-collector/discover-trains.js"
        );

        return [];
    }

    try {

        const content =
            fs.readFileSync(
                ACTIVE_TRAINS_FILE,
                "utf8"
            );

        const parsed =
            JSON.parse(content);

        if (!Array.isArray(parsed)) {

            console.error(
                "❌ active-trains.json must contain an array."
            );

            return [];
        }

        const trains = [
            ...new Set(
                parsed
                    .map(value =>
                        String(value).trim()
                    )
                    .filter(Boolean)
            )
        ];

        console.log(
            `✅ Loaded ${trains.length} train(s)`
        );

        console.log(
            `🚆 ${trains.join(", ")}`
        );

        return trains;

    } catch (error) {

        console.error(
            "❌ Failed to read active-trains.json"
        );

        console.error(
            error.message
        );

        return [];
    }
}

// ============================================================
// SAVE RAW RESPONSE
// ============================================================

function saveRawData(
    trainNumber,
    result
) {

    const timestamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            );

    const filename =
        `train_${trainNumber}_${timestamp}.json`;

    const filepath =
        path.join(
            RAW_DIR,
            filename
        );

    fs.writeFileSync(
        filepath,
        JSON.stringify(
            result,
            null,
            2
        ),
        "utf8"
    );

    console.log(
        `💾 Raw response saved: ${filename}`
    );
}

// ============================================================
// NUMBER HELPER
// ============================================================

function toNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

// ============================================================
// BOOLEAN HELPER
// ============================================================

function toBoolean(value) {

    if (value === true) {
        return true;
    }

    if (value === false) {
        return false;
    }

    if (
        String(value)
            .toLowerCase()
            .trim() === "true"
    ) {
        return true;
    }

    return false;
}

// ============================================================
// GET CURRENT STATION
// ============================================================

function getCurrentStation(data) {

    const location =
        data?.currentLocation || {};

    return {

        code:
            location.stationCode ||
            null,

        name:
            location.stationName ||
            null,

        sequence:
            toNumber(
                location.sequence
            ),

        delay:
            toNumber(
                location.delayMinutes
            ) ?? 0,

        distanceFromOrigin:
            toNumber(
                location.distanceFromOriginKm
            ),

        distanceFromLastStation:
            toNumber(
                location.distanceFromLastStationKm
            )
    };
}

// ============================================================
// FIND ROUTE STATION
// ============================================================

function findRouteStation(
    route,
    sequence,
    code
) {

    if (!Array.isArray(route)) {
        return null;
    }

    if (sequence !== null) {

        const bySequence =
            route.find(
                station =>
                    toNumber(
                        station.sequence
                    ) === sequence
            );

        if (bySequence) {
            return bySequence;
        }
    }

    if (code) {

        const byCode =
            route.find(
                station =>
                    String(
                        station.stationCode || ""
                    ).trim() ===
                    String(code).trim()
            );

        if (byCode) {
            return byCode;
        }
    }

    return null;
}

// ============================================================
// FIND NEXT ROUTE STATION
// ============================================================

function findNextRouteStation(
    route,
    currentSequence
) {

    if (
        !Array.isArray(route) ||
        currentSequence === null
    ) {
        return null;
    }

    const futureStations =
        route
            .filter(station => {

                const sequence =
                    toNumber(
                        station.sequence
                    );

                return (
                    sequence !== null &&
                    sequence > currentSequence
                );
            })
            .sort(
                (a, b) =>
                    toNumber(a.sequence) -
                    toNumber(b.sequence)
            );

    return futureStations[0] || null;
}

// ============================================================
// GET DAY FEATURES
// ============================================================

function getTimeFeatures(
    timestamp
) {

    const date =
        new Date(timestamp);

    const hour =
        date.getUTCHours();

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

    return {

        day_of_week:
            date.getUTCDay(),

        hour:
            hour,

        minute:
            date.getUTCMinutes(),

        month:
            date.getUTCMonth() + 1,

        time_period:
            timePeriod,

        is_weekend:
            date.getUTCDay() === 0 ||
            date.getUTCDay() === 6
    };
}

// ============================================================
// CREATE CSV HEADER
// ============================================================

const CSV_HEADERS = [

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
    "is_current_location",

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

// ============================================================
// SAVE ML CSV
// ============================================================

function saveMLData(records) {

    if (!records.length) {

        console.log(
            "⚠️ No records generated."
        );

        return;
    }

    const csvRows =
        records.map(record =>
            CSV_HEADERS
                .map(
                    header =>
                        csvEscape(
                            record[header]
                        )
                )
                .join(",")
        );

    const csv =
        CSV_HEADERS.join(",") +
        "\n" +
        csvRows.join("\n") +
        "\n";

    if (
        !fs.existsSync(ML_CSV) ||
        fs.statSync(ML_CSV).size === 0
    ) {

        fs.writeFileSync(
            ML_CSV,
            csv,
            "utf8"
        );

    } else {

        fs.appendFileSync(
            ML_CSV,
            csvRows.join("\n") +
            "\n",
            "utf8"
        );
    }

    console.log(
        `📈 CSV updated: ${records.length} rows`
    );
}

// ============================================================
// REMOVE DUPLICATES INSIDE SNAPSHOT
// ============================================================

function removeSnapshotDuplicates(
    records
) {

    const seen =
        new Set();

    const unique = [];

    for (const record of records) {

        const key = [

            record.train_number,
            record.journey_date,
            record.station_code,
            record.station_sequence,
            record.captured_at

        ].join("|");

        if (
            !seen.has(key)
        ) {

            seen.add(key);

            unique.push(record);
        }
    }

    return unique;
}

// ============================================================
// BUILD RECORDS
// ============================================================

function buildRecords(
    requestedTrainNumber,
    data
) {

    const rawRoute =
        Array.isArray(data.route)
            ? data.route
            : [];

    const trainNumber = String(
        data.trainNumber ||
        data.train?.number ||
        requestedTrainNumber || ""
    ).trim();

    if (trainNumber !== requestedTrainNumber) {
        console.log(
            `🔄 API returned train ${trainNumber}` +
            ` (requested ${requestedTrainNumber})`
        );
    }

    if (!rawRoute.length) {
        console.log(
            `⚠️ ${trainNumber}: route is empty`
        );
        return [];
    }

    const train = data.train || {};
    const trainName = data.trainName || train.name || null;
    const journeyDate = data.startDate || null;
    const apiUpdatedAt = data.lastUpdatedAt || null;

    // Current train location snapshot from API
    const current = getCurrentStation(data);

    // --------------------------------------------------------
    // ENSURE ROUTE IS SORTED STRICTLY BY STATION SEQUENCE ASCENDING
    // --------------------------------------------------------
    const route = [...rawRoute]
        .filter(s => s && (s.stationCode || s.stationName))
        .sort((a, b) => {
            const seqA = toNumber(a.sequence) ?? 0;
            const seqB = toNumber(b.sequence) ?? 0;
            return seqA - seqB;
        });

    const totalDistance = toNumber(train.distance);
    const capturedAt = new Date().toISOString();
    const timeFeatures = getTimeFeatures(capturedAt);

    // Live current delay from train location
    const currentDelay = current.delay ?? toNumber(data.delayMinutes) ?? 0;

    const records = route.map((station, index) => {
        const sequence = toNumber(station.sequence) ?? (index + 1);
        const stationCode = station.stationCode ? String(station.stationCode).trim().toUpperCase() : null;
        const stationName = station.stationName ? String(station.stationName).trim() : (stationCode || "Unknown");

        // --------------------------------------------------------
        // NEXT STATION FROM ORDERED ROUTE: index i -> index i + 1
        // Only final destination (index === route.length - 1) is null
        // --------------------------------------------------------
        const nextRouteStation = index < route.length - 1 ? route[index + 1] : null;
        const nextStationName = nextRouteStation
            ? (nextRouteStation.stationName ? String(nextRouteStation.stationName).trim() : (nextRouteStation.stationCode || null))
            : null;
        const nextStationCode = nextRouteStation
            ? (nextRouteStation.stationCode ? String(nextRouteStation.stationCode).trim().toUpperCase() : null)
            : null;
        const nextStationSequence = nextRouteStation
            ? (toNumber(nextRouteStation.sequence) ?? (index + 2))
            : null;

        // --------------------------------------------------------
        // PREVIOUS STATION FROM ORDERED ROUTE: index i -> index i - 1
        // Origin station (index === 0) is null
        // --------------------------------------------------------
        const prevRouteStation = index > 0 ? route[index - 1] : null;
        const previousStationName = prevRouteStation
            ? (prevRouteStation.stationName ? String(prevRouteStation.stationName).trim() : (prevRouteStation.stationCode || null))
            : null;

        // --------------------------------------------------------
        // VALIDATED LOCATION & COORDINATES FROM STATION MASTER
        // --------------------------------------------------------
        const stationInfo = stationMaster.getStationInfo(stationCode, stationName);

        const isCurrent =
            (current.sequence !== null && sequence === current.sequence) ||
            (current.code && stationCode && String(current.code).trim().toUpperCase() === stationCode);

        const arrivalDelay = toNumber(station.delayArrival);
        const departureDelay = toNumber(station.delayDeparture);

        let computedArrivalDelay = null;
        if (station.actualArrival && station.scheduledArrival) {
            const actualMs = new Date(station.actualArrival).getTime();
            const scheduledMs = new Date(station.scheduledArrival).getTime();
            if (!isNaN(actualMs) && !isNaN(scheduledMs)) {
                computedArrivalDelay = Math.round((actualMs - scheduledMs) / 60000);
            }
        }

        let computedDepartureDelay = null;
        if (station.actualDeparture && station.scheduledDeparture) {
            const actualMs = new Date(station.actualDeparture).getTime();
            const scheduledMs = new Date(station.scheduledDeparture).getTime();
            if (!isNaN(actualMs) && !isNaN(scheduledMs)) {
                computedDepartureDelay = Math.round((actualMs - scheduledMs) / 60000);
            }
        }

        const computedDelay = computedArrivalDelay ?? computedDepartureDelay;

        const resolvedArrivalDelay =
            arrivalDelay !== null
                ? arrivalDelay
                : computedArrivalDelay !== null
                    ? computedArrivalDelay
                    : departureDelay !== null
                        ? departureDelay
                        : (station.status === "departed" || station.status === "arrived")
                            ? currentDelay
                            : null;

        const resolvedDepartureDelay =
            departureDelay !== null
                ? departureDelay
                : computedDepartureDelay !== null
                    ? computedDepartureDelay
                    : arrivalDelay !== null
                        ? arrivalDelay
                        : station.status === "departed"
                            ? currentDelay
                            : null;

        const delayMinutes =
            arrivalDelay !== null
                ? arrivalDelay
                : departureDelay !== null
                    ? departureDelay
                    : computedDelay !== null
                        ? computedDelay
                        : (isCurrent || station.status === "departed" || station.status === "arrived")
                            ? currentDelay
                            : (station.status === "upcoming" ? currentDelay : null);

        const distance = toNumber(station.distance);
        const speed = toNumber(station.speedToNextStationKmph);

        let distanceRemaining = null;
        if (distance !== null && totalDistance !== null && totalDistance >= distance) {
            distanceRemaining = Number((totalDistance - distance).toFixed(2));
        }

        const resolvedDistanceFromLast = isCurrent
            ? current.distanceFromLastStation
            : null;

        const stationStatus = station.status || null;
        const runningStatus = data.status || (isCurrent ? station.status : null) || null;
        const isHalt = toBoolean(station.isHalt);

        return {
            train_number: trainNumber,
            train_name: trainName,
            journey_date: journeyDate,
            station_sequence: sequence,
            station_code: stationCode,
            station_name: stationName,
            city: stationInfo.city,
            state: stationInfo.state,
            latitude: stationInfo.latitude,
            longitude: stationInfo.longitude,
            scheduled_arrival: station.scheduledArrival || null,
            actual_arrival: station.actualArrival || null,
            scheduled_departure: station.scheduledDeparture || null,
            actual_departure: station.actualDeparture || null,
            arrival_delay_minutes: resolvedArrivalDelay,
            departure_delay_minutes: resolvedDepartureDelay,
            delay_minutes: delayMinutes,
            distance_from_origin_km: distance,
            distance_from_last_station_km: resolvedDistanceFromLast,
            distance_remaining_km: distanceRemaining,
            speed_kmph: speed,
            previous_station: previousStationName,
            current_station: stationName,
            is_current_location: isCurrent,
            next_station: nextStationName,
            next_station_code: nextStationCode,
            next_station_sequence: nextStationSequence,
            station_status: stationStatus,
            running_status: runningStatus,
            is_halt: isHalt,
            captured_at: capturedAt,
            api_updated_at: apiUpdatedAt,
            ...timeFeatures
        };
    });

    return removeSnapshotDuplicates(records);
}

// ============================================================
// INSERT INTO SUPABASE
// ============================================================

async function insertIntoSupabase(
    records
) {

    if (!records.length) {
        return 0;
    }

    const supabaseRecords =
        records.map(record => ({

            train_number:
                record.train_number,

            train_name:
                record.train_name,

            journey_date:
                record.journey_date,

            current_station:
                record.current_station,

            next_station:
                record.next_station,

            station_code:
                record.station_code,

            station_sequence:
                record.station_sequence,

            previous_station:
                record.previous_station,

            next_station_code:
                record.next_station_code,

            next_station_sequence:
                record.next_station_sequence,

            scheduled_arrival:
                record.scheduled_arrival,

            actual_arrival:
                record.actual_arrival,

            scheduled_departure:
                record.scheduled_departure,

            actual_departure:
                record.actual_departure,

            delay_minutes:
                record.delay_minutes,

            arrival_delay_minutes:
                record.arrival_delay_minutes,

            departure_delay_minutes:
                record.departure_delay_minutes,

            latitude:
                record.latitude,

            longitude:
                record.longitude,

            speed_kmph:
                record.speed_kmph,

            distance_remaining_km:
                record.distance_remaining_km,

            distance_from_origin_km:
                record.distance_from_origin_km,

            distance_from_last_station_km:
                record.distance_from_last_station_km,

            running_status:
                record.running_status,

            is_halt:
                record.is_halt,

            captured_at:
                record.captured_at,

            api_updated_at:
                record.api_updated_at
        }));

    // --------------------------------------------------------
    // Insert snapshot rows. Duplicates within a single run are
    // already removed by removeSnapshotDuplicates() above.
    // --------------------------------------------------------

    const {
        error
    } =
        await supabase
            .from("train_history")
            .insert(supabaseRecords);

    if (error) {

        console.error(
            "❌ Supabase insert failed:"
        );

        console.error(
            error.message
        );

        console.error(
            error.details || ""
        );

        console.error(
            error.hint || ""
        );

        return 0;
    }

    return supabaseRecords.length;
}

// ============================================================
// UPSERT STATIONS TO SUPABASE
// ============================================================

async function upsertStationsToSupabase(records) {
    if (!records || !records.length) return;

    const stationMap = new Map();
    for (const r of records) {
        if (r.station_code && !stationMap.has(r.station_code)) {
            stationMap.set(r.station_code, {
                station_code: r.station_code,
                station_name: r.station_name,
                city: r.city || null,
                state: r.state || null,
                latitude: r.latitude !== null && r.latitude !== undefined ? Number(r.latitude) : null,
                longitude: r.longitude !== null && r.longitude !== undefined ? Number(r.longitude) : null
            });
        }
    }

    const uniqueStations = Array.from(stationMap.values());
    if (!uniqueStations.length) return;

    try {
        await supabase
            .from("stations")
            .upsert(uniqueStations, { onConflict: "station_code" });
    } catch (e) {
        // background sync note
    }
}

// ============================================================
// UPSERT MASTER TRAIN DETAILS TO SUPABASE
// ============================================================

async function upsertMasterTrainRecord(data) {
    if (!data) return;
    const trainNum = String(data.trainNumber || data.train?.number || "").trim();
    if (!trainNum) return;

    const route = Array.isArray(data.route) ? data.route : [];
    const trainName = data.trainName || data.train?.name || null;
    const trainType = data.train?.type || data.train?.category || null;
    const sourceStation = data.train?.source?.name || data.train?.source?.code || route[0]?.stationName || null;
    const destinationStation = data.train?.destination?.name || data.train?.destination?.code || route[route.length - 1]?.stationName || null;

    try {
        await supabase
            .from("trains")
            .upsert({
                train_number: trainNum,
                train_name: trainName,
                train_type: trainType,
                source_station: sourceStation,
                destination_station: destinationStation
            }, { onConflict: "train_number" });
    } catch (e) {
        // ignore background master table sync error
    }
}

// ============================================================
// UPSERT REAL-TIME CURRENT TRAIN LOCATION (SINGLE RECORD PER TRAIN JOURNEY)
// ============================================================

async function upsertCurrentStatus(requestedTrainNumber, data) {
    if (!data) return;

    const trainNumber = data.trainNumber || data.train?.number || requestedTrainNumber;
    const journeyDate = data.startDate || null;
    if (!trainNumber || !journeyDate) return;

    const trainName = data.trainName || data.train?.name || null;
    const current = getCurrentStation(data);
    const route = Array.isArray(data.route) ? data.route : [];
    
    // Find matching route station if any
    const matchedRouteStation = findRouteStation(route, current.sequence, current.code);
    
    const apiNextHalt = data.nextHalt || {};
    const routeNextStation = findNextRouteStation(route, current.sequence);

    const previousHalt = data.previousHalt || {};
    const previousStation = previousHalt.stationName || null;

    const nextStationCode = apiNextHalt.stationCode || routeNextStation?.stationCode || null;
    const nextStationName = apiNextHalt.stationName || routeNextStation?.stationName || null;
    const nextStationSequence = toNumber(apiNextHalt.sequence) ?? toNumber(routeNextStation?.sequence);

    const totalDistance = toNumber(data.train?.distance);
    const currentDistance = current.distanceFromOrigin ?? toNumber(matchedRouteStation?.distance);
    
    let distanceRemaining = null;
    if (currentDistance !== null && totalDistance !== null && totalDistance >= currentDistance) {
        distanceRemaining = Number((totalDistance - currentDistance).toFixed(2));
    }

    const currentSeq = current.sequence ?? toNumber(matchedRouteStation?.sequence);
    const currentCode = current.code || matchedRouteStation?.stationCode || null;
    const currentName = current.name || matchedRouteStation?.stationName || null;

    let status = data.status || "IN_TRANSIT";

    // --------------------------------------------------------
    // VALIDATION: Sequence & Physical Feasibility Check
    // Compare against existing real-time record in train_current_status
    // --------------------------------------------------------
    try {
        const { data: existingRecord } = await supabase
            .from("train_current_status")
            .select("current_station_sequence, current_station_name, captured_at")
            .eq("train_number", String(trainNumber))
            .eq("journey_date", journeyDate)
            .maybeSingle();

        if (existingRecord) {
            const prevSeq = existingRecord.current_station_sequence;
            // Check for backward sequence jump (> 3 stations) at later capture time
            if (prevSeq !== null && currentSeq !== null && currentSeq < prevSeq - 3) {
                console.warn(
                    `⚠️ [CONFLICT DETECTED] Train ${trainNumber} reported at ${currentName} (Seq ${currentSeq}), ` +
                    `but was previously recorded at ${existingRecord.current_station_name} (Seq ${prevSeq}). Flagging conflict.`
                );
                status = "CONFLICT_FLAGGED";
            }
        }
    } catch (err) {
        // Continue if select fails
    }

    const payload = {
        train_number: String(trainNumber),
        journey_date: journeyDate,
        train_name: trainName,
        current_station_code: currentCode,
        current_station_name: currentName,
        current_station_sequence: currentSeq,
        previous_station: previousStation,
        next_station: nextStationName,
        next_station_code: nextStationCode,
        next_station_sequence: nextStationSequence,
        delay_minutes: current.delay,
        speed_kmph: matchedRouteStation ? toNumber(matchedRouteStation.speedToNextStationKmph) : null,
        distance_remaining_km: distanceRemaining,
        running_status: data.status || null,
        is_halt: toBoolean(matchedRouteStation?.isHalt),
        status: status,
        observed_at: data.lastUpdatedAt || new Date().toISOString(),
        captured_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabase
            .from("train_current_status")
            .upsert(payload, { onConflict: "train_number,journey_date" });

        if (error) {
            // Ignore error if table is not created yet in user's Supabase instance
            console.warn("⚠️ train_current_status update note:", error.message);
        } else {
            console.log(`📍 Real-time current status updated: Train ${trainNumber} @ ${currentName || 'Unknown'} (Seq ${currentSeq ?? 'N/A'}) [${status}]`);
        }
    } catch (e) {
        // ignore background error
    }
}

// ============================================================
// COLLECT ONE TRAIN
// ============================================================

async function collectTrainData(
    trainNumber
) {

    console.log(
        "\n------------------------------------------"
    );

    console.log(
        `🚆 FETCHING TRAIN ${trainNumber}`
    );

    console.log(
        "------------------------------------------"
    );

    const API_URL =
        `https://railradar.in/api/v1/trains/${trainNumber}/live`;

    try {

        // ----------------------------------------------------
        // API REQUEST
        // ----------------------------------------------------

        const response =
            await axios.get(
                API_URL,
                {
                    headers: {

                        Authorization:
                            `Bearer ${RAILRADAR_API_KEY}`
                    },

                    timeout:
                        30000
                }
            );

        const result =
            response.data;

        const data =
            result?.data;

        const apiTrainNumber =
            data?.trainNumber ||
            data?.train?.number ||
            trainNumber;

        // Sync master train details to Supabase
        await upsertMasterTrainRecord(data);

        // Sync single canonical real-time train location to Supabase
        await upsertCurrentStatus(apiTrainNumber, data);

        // ----------------------------------------------------
        // SAVE RAW RESPONSE
        // ----------------------------------------------------

        saveRawData(
            apiTrainNumber,
            result
        );

        if (!data) {

            console.log(
                `⚠️ ${trainNumber}: API returned no data`
            );

            return;
        }

        const route =
            Array.isArray(data.route)
                ? data.route
                : [];

        if (!route.length) {

            console.log(
                `⚠️ ${trainNumber}: no route`
            );

            return;
        }

        // ----------------------------------------------------
        // BUILD RECORDS
        // ----------------------------------------------------

        const records =
            buildRecords(
                trainNumber,
                data
            );

        if (!records.length) {

            console.log(
                `⚠️ ${trainNumber}: no records created`
            );

            return;
        }

        // ----------------------------------------------------
        // SAVE CSV
        // ----------------------------------------------------

        saveMLData(
            records
        );

        // ----------------------------------------------------
        // INSERT SUPABASE
        // ----------------------------------------------------

        const inserted =
            await insertIntoSupabase(
                records
            );

        // Sync stations master table in Supabase
        await upsertStationsToSupabase(
            records
        );

        // ----------------------------------------------------
        // CURRENT INFO
        // ----------------------------------------------------

        const current =
            getCurrentStation(data);

        const nextHalt =
            data.nextHalt || {};

        const train =
            data.train || {};

        console.log(
            "\n📊 COLLECTION SUMMARY"
        );

        console.log(
            `Train: ${trainNumber}`
        );

        console.log(
            `Name: ${
                data.trainName ||
                train.name ||
                "Unknown"
            }`
        );

        console.log(
            `Current station: ${
                current.name ||
                current.code ||
                "Unknown"
            }`
        );

        console.log(
            `Current sequence: ${
                current.sequence ??
                "Unknown"
            }`
        );

        console.log(
            `Current delay: ${
                current.delay
            } minutes`
        );

        console.log(
            `Next station: ${
                nextHalt.stationName ||
                nextHalt.stationCode ||
                "Unknown"
            }`
        );

        console.log(
            `Route rows: ${records.length}`
        );

        console.log(
            `Supabase inserted: ${inserted}`
        );

        console.log(
            `Captured at: ${
                records[0]?.captured_at
            }`
        );

    } catch (error) {

        console.error(
            `\n❌ Collector error: ${trainNumber}`
        );

        if (error.response) {

            console.error(
                `HTTP status: ${error.response.status}`
            );

            console.error(
                "API response:"
            );

            console.error(
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );

        } else {

            console.error(
                error.message
            );
        }
    }
}

// ============================================================
// COLLECT ALL TRAINS
// ============================================================

async function collectAllTrains() {

    console.log(
        "\n=========================================="
    );

    console.log(
        "🚆 TRAIN DATA COLLECTION CYCLE"
    );

    console.log(
        "=========================================="
    );

    console.log(
        `Time: ${new Date().toISOString()}`
    );

    const trainNumbers =
        loadTrainNumbers();

    if (!trainNumbers.length) {

        console.log(
            "⚠️ No active trains."
        );

        return;
    }

    for (
        let i = 0;
        i < trainNumbers.length;
        i++
    ) {

        const trainNumber =
            trainNumbers[i];

        await collectTrainData(
            trainNumber
        );

        if (
            i <
            trainNumbers.length - 1
        ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        BETWEEN_TRAIN_DELAY
                    )
            );
        }
    }

    console.log(
        "\n=========================================="
    );

    console.log(
        "✅ COLLECTION CYCLE COMPLETED"
    );

    console.log(
        "=========================================="
    );
}

// ============================================================
// START
// ============================================================

async function start() {
    console.log("\n==========================================");
    console.log("🚆 DYNAMIC TRAIN ETA COLLECTOR");
    console.log("==========================================");
    console.log("Supabase URL: OK");
    console.log("Supabase ANON key: OK");
    console.log("RailRadar API key: OK");
    console.log(`Collection interval: ${COLLECTION_INTERVAL / 60000} minutes`);

    // Optional single‑train mode via CLI argument
    const singleTrain = process.argv[2];
    if (singleTrain) {
        console.log(`🔹 Collecting data for single train: ${singleTrain}`);
        await collectTrainData(singleTrain);
        console.log("✅ Single train collection completed");
        return;
    }

    // First collection immediately
    await collectAllTrains();

    // Continue every 5 minutes
    setInterval(async () => {
        try {
            await collectAllTrains();
        } catch (error) {
            console.error("❌ Collection cycle crashed:");
            console.error(error.message);
        }

        },
        COLLECTION_INTERVAL
    );
}

start();