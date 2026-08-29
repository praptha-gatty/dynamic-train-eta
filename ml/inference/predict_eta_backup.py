import pandas as pd
import joblib

from pathlib import Path
from datetime import timedelta


# ============================================================
# DYNAMIC TRAIN ETA - AUTOMATIC INFERENCE
# ============================================================

print("=" * 70)
print("DYNAMIC TRAIN ETA - AUTOMATIC INFERENCE")
print("=" * 70)


# ============================================================
# 1. PATHS
# ============================================================

MODEL_PATH = Path("ml/models/dynamic_train_eta_model.pkl")
DATA_PATH = Path("ml/data_processing/train_ml_ready.csv")


# ============================================================
# 2. CHECK FILES
# ============================================================

if not MODEL_PATH.exists():
    raise SystemExit(
        f"\nERROR: Model not found:\n{MODEL_PATH}"
    )

if not DATA_PATH.exists():
    raise SystemExit(
        f"\nERROR: ML dataset not found:\n{DATA_PATH}"
    )


# ============================================================
# 3. LOAD MODEL
# ============================================================

print("\nLoading trained Random Forest model...")

try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    raise SystemExit(
        f"\nERROR loading model:\n{e}"
    )

print("Model loaded successfully.")


# ============================================================
# 4. LOAD DATASET
# ============================================================

print("\nLoading ML dataset...")

try:
    df = pd.read_csv(DATA_PATH)
except Exception as e:
    raise SystemExit(
        f"\nERROR loading dataset:\n{e}"
    )

print(f"Dataset rows: {len(df)}")
print(f"Dataset columns: {len(df.columns)}")


# ============================================================
# 5. REQUIRED RAW COLUMNS
#
# IMPORTANT:
# The following four engineered features are NOT checked here
# because we calculate them during inference:
#
# route_progress
# station_gap
# delay_horizon_interaction
# speed_horizon_distance
# ============================================================

required_columns = [
    "train_number",
    "station_code",
    "station_sequence",
    "current_delay_minutes",
    "current_speed_kmph",
    "current_distance_from_origin_km",
    "current_distance_remaining_km",
    "station_status",
    "running_status",
    "is_halt",
    "day_of_week",
    "hour",
    "minute",
    "month",
    "time_period",
    "is_weekend",
    "prediction_horizon_minutes",
    "future_station_code",
    "future_station_sequence"
]


missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]


if missing_columns:
    print("\nERROR: Missing required columns:")

    for column in missing_columns:
        print(f"- {column}")

    raise SystemExit(
        "\nPlease check train_ml_ready.csv."
    )


print("\nAll required columns are available.")


# ============================================================
# 6. BASIC DATA CLEANING
# ============================================================

df["train_number"] = pd.to_numeric(
    df["train_number"],
    errors="coerce"
)

df["station_sequence"] = pd.to_numeric(
    df["station_sequence"],
    errors="coerce"
)

df["future_station_sequence"] = pd.to_numeric(
    df["future_station_sequence"],
    errors="coerce"
)

df["prediction_horizon_minutes"] = pd.to_numeric(
    df["prediction_horizon_minutes"],
    errors="coerce"
)


df = df.dropna(
    subset=[
        "train_number",
        "station_sequence"
    ]
).copy()


# ============================================================
# 7. USER INPUT
#
# The passenger only needs to provide:
#
# 1. Train number
# 2. Destination station
#
# Technical ML features are obtained automatically.
# ============================================================

print("\n" + "=" * 70)
print("TRAIN ETA REQUEST")
print("=" * 70)


train_number_input = input(
    "\nEnter train number: "
).strip()


future_station_input = input(
    "Enter destination/future station code: "
).strip().upper()


# ============================================================
# 8. VALIDATE TRAIN NUMBER
# ============================================================

try:

    train_number = int(train_number_input)

except ValueError:

    raise SystemExit(
        "\nERROR: Train number must be numeric."
    )


# ============================================================
# 9. FIND TRAIN DATA
# ============================================================

train_data = df[
    df["train_number"] == train_number
].copy()


if train_data.empty:

    raise SystemExit(
        f"\nERROR: Train {train_number} "
        "was not found in the ML dataset."
    )


print(
    f"\nTrain {train_number} found."
)


# ============================================================
# 10. FIND CURRENT TRAIN RECORD
#
# Our current ML dataset does not contain a reliable live
# timestamp column.
#
# Therefore, for LOCAL TESTING ONLY, we use the last available
# observation in the dataset.
#
# Later, Person 1's live backend will provide the actual latest
# train position.
# ============================================================

if "captured_at" in train_data.columns:

    timestamps = pd.to_datetime(
        train_data["captured_at"],
        errors="coerce"
    )

    if timestamps.notna().any():

        train_data["_timestamp"] = timestamps

        latest_row = train_data.loc[
            train_data["_timestamp"].idxmax()
        ].copy()

    else:

        latest_row = train_data.iloc[-1].copy()

elif "api_updated_at" in train_data.columns:

    timestamps = pd.to_datetime(
        train_data["api_updated_at"],
        errors="coerce"
    )

    if timestamps.notna().any():

        train_data["_timestamp"] = timestamps

        latest_row = train_data.loc[
            train_data["_timestamp"].idxmax()
        ].copy()

    else:

        latest_row = train_data.iloc[-1].copy()

else:

    # Local dataset does not contain live timestamp.
    # Use the last available observation for testing.

    latest_row = train_data.iloc[-1].copy()


# ============================================================
# 11. AUTOMATICALLY GET CURRENT TRAIN INFORMATION
# ============================================================

current_station = str(
    latest_row["station_code"]
).upper()


current_station_sequence = float(
    latest_row["station_sequence"]
)


current_delay = pd.to_numeric(
    latest_row["current_delay_minutes"],
    errors="coerce"
)


current_speed = pd.to_numeric(
    latest_row["current_speed_kmph"],
    errors="coerce"
)


current_distance_from_origin = pd.to_numeric(
    latest_row["current_distance_from_origin_km"],
    errors="coerce"
)


current_distance_remaining = pd.to_numeric(
    latest_row["current_distance_remaining_km"],
    errors="coerce"
)


# ============================================================
# 12. HANDLE MISSING NUMERIC VALUES
# ============================================================

if pd.isna(current_delay):
    current_delay = 0.0
else:
    current_delay = float(current_delay)


if pd.isna(current_speed):
    current_speed = 0.0
else:
    current_speed = float(current_speed)


if pd.isna(current_distance_from_origin):
    current_distance_from_origin = 0.0
else:
    current_distance_from_origin = float(
        current_distance_from_origin
    )


if pd.isna(current_distance_remaining):
    current_distance_remaining = 0.0
else:
    current_distance_remaining = float(
        current_distance_remaining
    )


# ============================================================
# 13. OTHER CURRENT FEATURES
# ============================================================

station_status = latest_row["station_status"]

running_status = latest_row["running_status"]

is_halt = latest_row["is_halt"]

day_of_week = int(
    latest_row["day_of_week"]
)

hour = int(
    latest_row["hour"]
)

minute = int(
    latest_row["minute"]
)

month = int(
    latest_row["month"]
)

time_period = latest_row["time_period"]

is_weekend = latest_row["is_weekend"]


# ============================================================
# 14. FIND DESTINATION / FUTURE STATION
#
# Search the route for the requested station after the current
# station.
# ============================================================

route_stations = train_data[
    train_data["station_code"]
    .astype(str)
    .str.upper()
    == future_station_input
].copy()


# Only stations AFTER the current station

route_stations = route_stations[
    route_stations["station_sequence"]
    > current_station_sequence
].copy()


if route_stations.empty:

    # Try future_station_code as a backup

    route_stations = train_data[
        train_data["future_station_code"]
        .astype(str)
        .str.upper()
        == future_station_input
    ].copy()

    route_stations = route_stations[
        route_stations["future_station_sequence"]
        > current_station_sequence
    ].copy()


if route_stations.empty:

    raise SystemExit(
        f"\nERROR: Station {future_station_input} "
        f"was not found after current station "
        f"{current_station}."
    )


# Select nearest occurrence of destination

target_row = route_stations.sort_values(
    "station_sequence"
).iloc[0].copy()


future_station_code = future_station_input


future_station_sequence = float(
    target_row["station_sequence"]
)


# ============================================================
# 15. DETERMINE PREDICTION HORIZON
# ============================================================

prediction_horizon = pd.to_numeric(
    target_row["prediction_horizon_minutes"],
    errors="coerce"
)


if pd.isna(prediction_horizon):

    # Backup: search rows where destination is future station

    matching_future = train_data[
        train_data["future_station_code"]
        .astype(str)
        .str.upper()
        == future_station_input
    ].copy()

    matching_future = matching_future[
        matching_future["future_station_sequence"]
        > current_station_sequence
    ].copy()


    if not matching_future.empty:

        prediction_horizon = pd.to_numeric(
            matching_future.iloc[0][
                "prediction_horizon_minutes"
            ],
            errors="coerce"
        )


# If still unavailable, use a safe default for testing

if pd.isna(prediction_horizon):

    print(
        "\nWARNING: Prediction horizon unavailable."
    )

    print(
        "Using 30 minutes for local testing."
    )

    prediction_horizon = 30.0


prediction_horizon = float(
    prediction_horizon
)


# Ensure positive horizon

prediction_horizon = max(
    1.0,
    prediction_horizon
)


# ============================================================
# 16. ENGINEER FEATURES
#
# These four features were created during our feature
# engineering stage and must also be recreated during inference.
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
# 17. CREATE MODEL INPUT
# ============================================================

model_input = pd.DataFrame([{

    "train_number":
        train_number,

    "station_code":
        current_station,

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
# 18. GENERATE PREDICTION
# ============================================================

print("\n" + "=" * 70)
print("GENERATING PREDICTION")
print("=" * 70)


try:

    predicted_delay = model.predict(
        model_input
    )[0]

except Exception as e:

    print("\nERROR during prediction:")

    print(e)

    print("\nModel input columns:")

    for column in model_input.columns:
        print(
            f"- {column}"
        )

    raise SystemExit()


predicted_delay = float(
    predicted_delay
)


# Delay cannot be negative

predicted_delay = max(
    0.0,
    predicted_delay
)


# ============================================================
# 19. DETERMINE CURRENT TIMESTAMP
#
# For local testing:
# use timestamp from dataset if available.
#
# Otherwise use current computer time.
#
# In final integration this will come from live backend data.
# ============================================================

current_timestamp = None


if "captured_at" in latest_row.index:

    try:

        current_timestamp = pd.to_datetime(
            latest_row["captured_at"],
            errors="coerce"
        )

    except Exception:

        current_timestamp = None


if (
    current_timestamp is None
    or pd.isna(current_timestamp)
):

    if "api_updated_at" in latest_row.index:

        try:

            current_timestamp = pd.to_datetime(
                latest_row["api_updated_at"],
                errors="coerce"
            )

        except Exception:

            current_timestamp = None


if (
    current_timestamp is None
    or pd.isna(current_timestamp)
):

    current_timestamp = pd.Timestamp.now()


# ============================================================
# 20. CALCULATE ETA
#
# Travel time to future station
# +
# predicted future delay
#
# gives estimated arrival time.
# ============================================================

estimated_arrival = (
    current_timestamp
    +
    timedelta(
        minutes=(
            prediction_horizon
            +
            predicted_delay
        )
    )
)


# ============================================================
# 21. DISPLAY RESULT
# ============================================================

print("\n" + "=" * 70)
print("DYNAMIC TRAIN ETA RESULT")
print("=" * 70)


print(
    f"\nTrain: {train_number}"
)


print(
    f"Current station: {current_station}"
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
    f"\nFuture station: "
    f"{future_station_code}"
)


print(
    f"Future station sequence: "
    f"{future_station_sequence:.0f}"
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
    f"Estimated arrival time: "
    f"{estimated_arrival.strftime('%Y-%m-%d %H:%M:%S')}"
)


# ============================================================
# 22. PASSENGER-FRIENDLY SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("PASSENGER SUMMARY")
print("=" * 70)


print(
    f"\nTrain {train_number} "
    f"is currently at {current_station}."
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
    f"{estimated_arrival.strftime('%I:%M %p')}"
)


# ============================================================
# 23. COMPLETION
# ============================================================

print("\n" + "=" * 70)
print("PREDICTION COMPLETED")
print("=" * 70)