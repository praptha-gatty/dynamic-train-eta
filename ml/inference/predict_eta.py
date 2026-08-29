import os
import json
import urllib.request
import urllib.parse
from pathlib import Path

import pandas as pd
import joblib


# ============================================================
# DYNAMIC TRAIN ETA - LIVE SUPABASE INFERENCE
# ============================================================

print("=" * 70)
print("DYNAMIC TRAIN ETA - LIVE SUPABASE INFERENCE")
print("=" * 70)


# ============================================================
# 1. PATHS
# ============================================================

MODEL_PATH = Path("ml/models/dynamic_train_eta_model.pkl")
ENV_PATH = Path(".env")


# ============================================================
# 2. LOAD .ENV
# ============================================================

def load_env(path):
    values = {}

    if not path.exists():
        return values

    for raw_line in path.read_text(
        encoding="utf-8"
    ).splitlines():

        line = raw_line.strip()

        if (
            not line
            or line.startswith("#")
            or "=" not in line
        ):
            continue

        key, value = line.split("=", 1)

        values[key.strip()] = (
            value.strip()
            .strip('"')
            .strip("'")
        )

    return values


env = load_env(ENV_PATH)

SUPABASE_URL = (
    env.get("SUPABASE_URL")
    or os.getenv("SUPABASE_URL")
)

SUPABASE_ANON_KEY = (
    env.get("SUPABASE_ANON_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
)


if not SUPABASE_URL or not SUPABASE_ANON_KEY:

    raise SystemExit(
        "\nERROR: SUPABASE_URL or "
        "SUPABASE_ANON_KEY is missing "
        "from .env"
    )


# ============================================================
# 3. CHECK MODEL
# ============================================================

if not MODEL_PATH.exists():

    raise SystemExit(
        f"\nERROR: Model not found:\n"
        f"{MODEL_PATH}"
    )


# ============================================================
# 4. LOAD RANDOM FOREST MODEL
# ============================================================

print(
    "\nLoading trained Random Forest model..."
)

try:

    model = joblib.load(MODEL_PATH)

except Exception as e:

    raise SystemExit(
        f"\nERROR loading model:\n{e}"
    )


print("Model loaded successfully.")


# ============================================================
# 5. SUPABASE GET FUNCTION
# ============================================================

import time

def supabase_get(table, params, max_retries=3, timeout=5):

    query = urllib.parse.urlencode(
        params
    )

    url = (
        f"{SUPABASE_URL.rstrip('/')}"
        f"/rest/v1/{table}?{query}"
    )

    request = urllib.request.Request(

        url,

        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization":
                f"Bearer {SUPABASE_ANON_KEY}",
            "Accept": "application/json",
        },

        method="GET",
    )

    for attempt in range(1, max_retries + 2):
        try:

            with urllib.request.urlopen(
                request,
                timeout=timeout
            ) as response:

                return json.loads(
                    response.read().decode(
                        "utf-8"
                    )
                )

        except Exception as exc:
            if attempt <= max_retries:
                backoff = (2 ** (attempt - 1)) + 0.2
                print(f"⚠️ Supabase request failed (attempt {attempt}/{max_retries + 1}): {exc}. Retrying in {backoff:.1f}s...")
                time.sleep(backoff)
            else:
                raise SystemExit(
                    f"\nERROR reading Supabase table "
                    f"'{table}':\n{exc}"
                )


# ============================================================
# 6. HELPER FUNCTIONS
# ============================================================

def number(value, default=0.0):

    try:

        result = float(value)

        if pd.isna(result):
            return default

        return result

    except (
        TypeError,
        ValueError
    ):

        return default


def get_time_period(hour):

    if 5 <= hour < 12:
        return "morning"

    elif 12 <= hour < 17:
        return "afternoon"

    elif 17 <= hour < 21:
        return "evening"

    else:
        return "night"


def parse_timestamp(row):

    value = (
        row.get("api_updated_at")
        or row.get("captured_at")
    )

    timestamp = pd.to_datetime(
        value,
        errors="coerce",
        utc=True
    )

    if pd.isna(timestamp):

        timestamp = pd.Timestamp.now(
            tz="UTC"
        )

    return timestamp


# ============================================================
# 7. USER INPUT
# ============================================================

print("\n" + "=" * 70)
print("TRAIN ETA REQUEST")
print("=" * 70)

train_number_input = input(
    "\nEnter train number: "
).strip()

destination_input = input(
    "Enter destination/future station code: "
).strip().upper()


# ============================================================
# 8. VALIDATE TRAIN NUMBER
# ============================================================

try:

    train_number = int(
        train_number_input
    )

except ValueError:

    raise SystemExit(
        "\nERROR: Train number must be numeric."
    )


# ============================================================
# 9. FETCH LIVE TRAIN DATA
# ============================================================

print(
    "\nFetching live train information..."
)

recent_rows = supabase_get(

    "train_history",

    {
        "select":
            "history_id,"
            "train_number,"
            "current_station,"
            "station_code,"
            "station_sequence,"
            "next_station_code,"
            "next_station_sequence,"
            "delay_minutes,"
            "speed_kmph,"
            "distance_remaining_km,"
            "distance_from_origin_km,"
            "running_status,"
            "is_halt,"
            "captured_at,"
            "api_updated_at,"
            "journey_date",

        "train_number":
            f"eq.{train_number}",

        # Only records that contain
        # the current train location.
        "current_station":
            "not.is.null",

        # Latest records first.
        "order":
            "captured_at.desc",

        # Keep response small.
        "limit":
            "20",
    }
)


if not recent_rows:

    raise SystemExit(
        f"\nERROR: No live records found "
        f"for train {train_number}."
    )


print(
    f"Live records found: "
    f"{len(recent_rows)}"
)


# ============================================================
# 10. DETERMINE CURRENT STATION
# ============================================================

current_station_name = None

for row in recent_rows:

    value = row.get(
        "current_station"
    )

    if value:

        current_station_name = (
            str(value).strip()
        )

        break


if not current_station_name:

    raise SystemExit(
        "\nERROR: Could not determine "
        "current station."
    )


# ============================================================
# 11. FIND CURRENT STATION CODE
# ============================================================

print(
    f"Current station detected: "
    f"{current_station_name}"
)


station_matches = supabase_get(

    "stations",

    {
        "select":
            "station_code,station_name",

        "station_name":
            f"ilike.*{current_station_name}*",

        "limit":
            "10",
    }
)


exact_matches = [

    row

    for row in station_matches

    if str(
        row.get(
            "station_name",
            ""
        )
    ).strip().lower()
    ==
    current_station_name.lower()

]


if exact_matches:

    station_match = (
        exact_matches[0]
    )

elif station_matches:

    station_match = (
        station_matches[0]
    )

else:

    raise SystemExit(
        f"\nERROR: Station "
        f"'{current_station_name}' "
        f"was not found in stations table."
    )


current_station_code = str(
    station_match["station_code"]
).upper()


print(
    f"Current station code: "
    f"{current_station_code}"
)


# ============================================================
# 12. FIND CURRENT STATION RECORD
# ============================================================

current_rows = [

    row

    for row in recent_rows

    if str(
        row.get(
            "station_code",
            ""
        )
    ).upper()
    ==
    current_station_code

]


# If current station record wasn't
# included in the first 20 rows,
# query it directly.

if not current_rows:

    current_rows = supabase_get(

        "train_history",

        {
            "select":
                "history_id,"
                "train_number,"
                "current_station,"
                "station_code,"
                "station_sequence,"
                "next_station_code,"
                "next_station_sequence,"
                "delay_minutes,"
                "speed_kmph,"
                "distance_remaining_km,"
                "distance_from_origin_km,"
                "running_status,"
                "is_halt,"
                "captured_at,"
                "api_updated_at,"
                "journey_date",

            "train_number":
                f"eq.{train_number}",

            "station_code":
                f"eq.{current_station_code}",

            "order":
                "captured_at.desc",

            "limit":
                "10",
        }
    )


if not current_rows:

    raise SystemExit(

        f"\nERROR: Current station "
        f"{current_station_code} was not "
        f"found for train {train_number}."
    )


# Prefer a row whose current_station
# matches the detected current station.

matching_current = [

    row

    for row in current_rows

    if str(
        row.get(
            "current_station",
            ""
        )
    ).strip().lower()
    ==
    current_station_name.lower()

]


if matching_current:

    current_row = (
        matching_current[0]
    )

else:

    current_row = (
        current_rows[0]
    )


# ============================================================
# 13. CURRENT TRAIN FEATURES
# ============================================================

current_station_sequence = number(

    current_row.get(
        "station_sequence"
    ),

    -1

)


if current_station_sequence < 0:

    raise SystemExit(
        "\nERROR: Current station "
        "sequence is missing."
    )


current_delay = number(

    current_row.get(
        "delay_minutes"
    ),

    0.0

)


current_speed = number(

    current_row.get(
        "speed_kmph"
    ),

    0.0

)


current_distance_from_origin = number(

    current_row.get(
        "distance_from_origin_km"
    ),

    0.0

)


current_distance_remaining = number(

    current_row.get(
        "distance_remaining_km"
    ),

    0.0

)


running_status = str(

    current_row.get(
        "running_status"
    )
    or "unknown"

)


is_halt_raw = current_row.get(
    "is_halt"
)


if is_halt_raw is None:

    is_halt = False

else:

    is_halt = bool(
        is_halt_raw
    )


# train_history does not contain
# station_status directly.
#
# Therefore derive it from is_halt.

if is_halt:

    station_status = "halt"

else:

    station_status = "running"


# ============================================================
# 14. FIND DESTINATION ON ROUTE
# ============================================================

print(
    f"Finding destination: "
    f"{destination_input}"
)


destination_rows = supabase_get(

    "train_history",

    {
        "select":
            "station_code,"
            "station_sequence,"
            "distance_from_origin_km,"
            "captured_at",

        "train_number":
            f"eq.{train_number}",

        "station_code":
            f"eq.{destination_input}",

        "order":
            "station_sequence.asc",

        "limit":
            "100",
    }
)


# Keep only stations ahead
# of current train position.

destination_rows = [

    row

    for row in destination_rows

    if number(
        row.get(
            "station_sequence"
        ),
        -1
    )
    >
    current_station_sequence

]


if not destination_rows:

    raise SystemExit(

        f"\nERROR: Station "
        f"{destination_input} was not "
        f"found after current station "
        f"{current_station_code} "
        f"(sequence "
        f"{current_station_sequence:.0f})."
    )


# Select the nearest occurrence.

target_row = destination_rows[0]


future_station_code = (
    destination_input
)


future_station_sequence = number(

    target_row.get(
        "station_sequence"
    ),

    -1

)


if future_station_sequence < 0:

    raise SystemExit(
        "\nERROR: Destination station "
        "sequence is missing."
    )


future_distance_from_origin = number(

    target_row.get(
        "distance_from_origin_km"
    ),

    current_distance_from_origin

)


# ============================================================
# 15. CALCULATE PREDICTION HORIZON
# ============================================================

distance_to_target = max(

    0.0,

    future_distance_from_origin
    -
    current_distance_from_origin

)


DEFAULT_AVG_SPEED_KMPH = 45.0

effective_speed = (
    current_speed
    if (current_speed is not None and current_speed > 0)
    else DEFAULT_AVG_SPEED_KMPH
)

if distance_to_target > 0:

    prediction_horizon = (

        distance_to_target
        /
        effective_speed

    ) * 60.0

    if current_speed <= 0:
        print(
            f"\nNOTICE: Train is stationary or speed telemetry is 0 km/h. "
            f"Using default average speed ({DEFAULT_AVG_SPEED_KMPH} km/h) for section velocity."
        )

else:

    print(
        "\nWARNING: Destination distance unavailable."
    )

    print(
        "Using 30 minutes as fallback "
        "prediction horizon."
    )

    prediction_horizon = 30.0


prediction_horizon = max(

    1.0,

    float(
        prediction_horizon
    )

)


# ============================================================
# 16. TIME FEATURES
# ============================================================

live_timestamp = parse_timestamp(
    current_row
)


local_timestamp = (

    live_timestamp
    .tz_convert(
        "Asia/Kolkata"
    )

)


day_of_week = int(
    local_timestamp.dayofweek
)


hour = int(
    local_timestamp.hour
)


minute = int(
    local_timestamp.minute
)


month = int(
    local_timestamp.month
)


is_weekend = int(
    day_of_week >= 5
)


time_period = get_time_period(
    hour
)


# ============================================================
# 17. ENGINEER FEATURES
# ============================================================

station_gap = (

    future_station_sequence
    -
    current_station_sequence

)


if future_station_sequence > 0:

    route_progress = (

        current_station_sequence
        /
        future_station_sequence

    )

else:

    route_progress = 0.0


delay_horizon_interaction = (

    current_delay
    *
    prediction_horizon

)


speed_horizon_distance = (

    current_speed
    *
    prediction_horizon
    /
    60.0

)


# ============================================================
# 18. CREATE MODEL INPUT
# ============================================================

model_input = pd.DataFrame([{

    "train_number":
        train_number,

    "station_code":
        current_station_code,

    "station_sequence":
        current_station_sequence,

    "current_delay_minutes":
        current_delay,

    "current_speed_kmph":
        current_speed,

    "current_distance_from_origin_km":
        current_distance_from_origin,

    "current_distance_remaining_km":
        current_distance_remaining,

    "station_status":
        station_status,

    "running_status":
        running_status,

    "is_halt":
        is_halt,

    "day_of_week":
        day_of_week,

    "hour":
        hour,

    "minute":
        minute,

    "month":
        month,

    "time_period":
        time_period,

    "is_weekend":
        is_weekend,

    "prediction_horizon_minutes":
        prediction_horizon,

    "future_station_code":
        future_station_code,

    "future_station_sequence":
        future_station_sequence,

    "route_progress":
        route_progress,

    "station_gap":
        station_gap,

    "delay_horizon_interaction":
        delay_horizon_interaction,

    "speed_horizon_distance":
        speed_horizon_distance

}])


# ============================================================
# 19. GENERATE PREDICTION
# ============================================================

print(
    "\n" + "=" * 70
)

print(
    "GENERATING PREDICTION"
)

print(
    "=" * 70
)


try:

    predicted_delay = float(

        model.predict(
            model_input
        )[0]

    )

except Exception as e:

    print(
        "\nERROR during prediction:"
    )

    print(e)

    print(
        "\nModel input:"
    )

    print(
        model_input.to_string(
            index=False
        )
    )

    raise SystemExit(1)


# Delay cannot be negative.

predicted_delay = max(

    0.0,

    predicted_delay

)


# ============================================================
# 20. CALCULATE ETA
# ============================================================

estimated_arrival = (

    live_timestamp
    +
    pd.Timedelta(
        minutes=(
            prediction_horizon
            +
            predicted_delay
        )
    )

)


estimated_arrival_local = (

    estimated_arrival
    .tz_convert(
        "Asia/Kolkata"
    )

)


# ============================================================
# 21. DISPLAY RESULT
# ============================================================

print(
    "\n" + "=" * 70
)

print(
    "DYNAMIC TRAIN ETA RESULT"
)

print(
    "=" * 70
)


print(
    f"\nTrain: "
    f"{train_number}"
)


print(
    f"Current station: "
    f"{current_station_name} "
    f"({current_station_code})"
)


print(
    f"Current station sequence: "
    f"{current_station_sequence:.0f}"
)


print(
    f"Current delay: "
    f"{current_delay:.2f} minutes"
)


print(
    f"Current speed: "
    f"{current_speed:.2f} km/h"
)


print(
    f"Running status: "
    f"{running_status}"
)


print(
    f"Is halt: "
    f"{is_halt}"
)


print(
    f"\nFuture station: "
    f"{future_station_code}"
)


print(
    f"Future station sequence: "
    f"{future_station_sequence:.0f}"
)


print(
    f"Distance to destination: "
    f"{distance_to_target:.2f} km"
)


print(
    f"Prediction horizon: "
    f"{prediction_horizon:.2f} minutes"
)


print(
    f"\nPredicted future delay: "
    f"{predicted_delay:.2f} minutes"
)


print(
    f"Estimated arrival time (IST): "
    f"{estimated_arrival_local.strftime('%Y-%m-%d %I:%M:%S %p')}"
)


# ============================================================
# 22. PASSENGER SUMMARY
# ============================================================

print(
    "\n" + "=" * 70
)

print(
    "PASSENGER SUMMARY"
)

print(
    "=" * 70
)


print(
    f"\nTrain {train_number} "
    f"is currently at "
    f"{current_station_name}."
)


if current_delay == 0:

    print(
        "Current status: On time"
    )

else:

    print(
        f"Current delay: "
        f"{current_delay:.1f} minutes"
    )


print(
    f"Destination: "
    f"{future_station_code}"
)


print(
    f"Predicted delay at destination: "
    f"{predicted_delay:.1f} minutes"
)


print(
    f"Estimated arrival: "
    f"{estimated_arrival_local.strftime('%I:%M %p')}"
)


# ============================================================
# 23. COMPLETION
# ============================================================

print(
    "\n" + "=" * 70
)

print(
    "PREDICTION COMPLETED"
)

print(
    "=" * 70
)