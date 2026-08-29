import pandas as pd
from pathlib import Path


print("=" * 70)
print("CREATING ML TRAINING DATASET")
print("=" * 70)


# ---------------------------------------------------------
# 1. FILE PATHS
# ---------------------------------------------------------

input_path = Path("data/processed/train_history_clean.csv")
output_path = Path("ml/data_processing/train_ml_ready.csv")


# ---------------------------------------------------------
# 2. LOAD DATA
# ---------------------------------------------------------

print("\nLoading historical data...")

df = pd.read_csv(input_path)

print("Original rows:", len(df))
print("Original columns:", len(df.columns))


# ---------------------------------------------------------
# 3. CHECK REQUIRED COLUMNS
# ---------------------------------------------------------

required_columns = [
    "train_number",
    "journey_date",
    "station_sequence",
    "station_code",
    "station_name",
    "scheduled_arrival",
    "scheduled_departure",
    "actual_arrival",
    "actual_departure",
    "delay_minutes",
    "distance_from_origin_km",
    "distance_remaining_km",
    "speed_kmph",
    "station_status",
    "running_status",
    "is_halt",
    "captured_at",
    "day_of_week",
    "hour",
    "minute",
    "month",
    "time_period",
    "is_weekend"
]


missing_columns = [
    col for col in required_columns
    if col not in df.columns
]

if missing_columns:
    print("\nERROR: Missing columns:")
    for col in missing_columns:
        print("-", col)

    raise SystemExit("Required columns are missing.")


print("All required columns are available.")


# ---------------------------------------------------------
# 4. CONVERT TIMESTAMPS
# ---------------------------------------------------------

print("\nConverting timestamps...")

df["captured_at"] = pd.to_datetime(
    df["captured_at"],
    errors="coerce",
    utc=True
)

df["journey_date"] = pd.to_datetime(
    df["journey_date"],
    errors="coerce",
    utc=True
)


# ---------------------------------------------------------
# 5. REMOVE INVALID CURRENT OBSERVATIONS
# ---------------------------------------------------------

before_cleaning = len(df)

df = df[
    df["captured_at"].notna()
    & df["journey_date"].notna()
    & df["delay_minutes"].notna()
    & (df["delay_minutes"] >= 0)
].copy()

print(
    "Rows after current-delay cleaning:",
    len(df)
)

print(
    "Rows removed:",
    before_cleaning - len(df)
)


# ---------------------------------------------------------
# 6. SORT DATA
# ---------------------------------------------------------

df = df.sort_values(
    [
        "train_number",
        "journey_date",
        "captured_at",
        "station_sequence"
    ]
).reset_index(drop=True)


# ---------------------------------------------------------
# 7. CREATE FUTURE OBSERVATIONS
# ---------------------------------------------------------

print("\nFinding future station observations...")

training_rows = []

for i in range(len(df)):

    current = df.iloc[i]

    # Find observations of the same train and journey
    # that occur later in time AND later in route sequence.
    future = df[
        (df["train_number"] == current["train_number"])
        & (df["journey_date"] == current["journey_date"])
        & (df["captured_at"] > current["captured_at"])
        & (
            df["station_sequence"]
            > current["station_sequence"]
        )
        & df["delay_minutes"].notna()
        & (df["delay_minutes"] >= 0)
    ]

    if future.empty:
        continue


    # -----------------------------------------------------
    # Select earliest valid future observation
    # -----------------------------------------------------

    future = future.sort_values(
        "captured_at"
    ).iloc[0]


    # -----------------------------------------------------
    # Calculate prediction horizon
    # -----------------------------------------------------

    prediction_horizon = (
        future["captured_at"]
        - current["captured_at"]
    ).total_seconds() / 60


    # Ignore invalid or very distant observations
    if prediction_horizon <= 0:
        continue

    if prediction_horizon > 60:
        continue


    # -----------------------------------------------------
    # Create ML training row
    # -----------------------------------------------------

    training_rows.append({

        # -----------------------------
        # Train information
        # -----------------------------

        "train_number":
            current["train_number"],

        "journey_date":
            current["journey_date"],


        # -----------------------------
        # Current station information
        # -----------------------------

        "station_code":
            current["station_code"],

        "station_name":
            current["station_name"],

        "station_sequence":
            current["station_sequence"],


        # -----------------------------
        # Current train state
        # -----------------------------

        "current_delay_minutes":
            current["delay_minutes"],

        "current_speed_kmph":
            current["speed_kmph"],

        "current_distance_from_origin_km":
            current["distance_from_origin_km"],

        "current_distance_remaining_km":
            current["distance_remaining_km"],

        "station_status":
            current["station_status"],

        "running_status":
            current["running_status"],

        "is_halt":
            current["is_halt"],


        # -----------------------------
        # Time features
        # -----------------------------

        "day_of_week":
            current["day_of_week"],

        "hour":
            current["hour"],

        "minute":
            current["minute"],

        "month":
            current["month"],

        "time_period":
            current["time_period"],

        "is_weekend":
            current["is_weekend"],


        # -----------------------------
        # Future station information
        # -----------------------------

        "future_station_code":
            future["station_code"],

        "future_station_name":
            future["station_name"],

        "future_station_sequence":
            future["station_sequence"],

        "future_distance_from_origin_km":
            future["distance_from_origin_km"],

        "future_distance_remaining_km":
            future["distance_remaining_km"],

        "future_speed_kmph":
            future["speed_kmph"],


        # -----------------------------
        # Prediction horizon
        # -----------------------------

        "prediction_horizon_minutes":
            prediction_horizon,


        # -----------------------------
        # TARGET
        # -----------------------------
        # What we want the ML model
        # to predict:
        #
        # Future delay at the future station
        # -----------------------------

        "target_delay_minutes":
            future["delay_minutes"],


        # -----------------------------
        # Additional target
        # -----------------------------
        # Useful for analysis
        # but not necessarily the
        # primary prediction target.
        # -----------------------------

        "target_delay_change_minutes":
            (
                future["delay_minutes"]
                - current["delay_minutes"]
            )
    })


# ---------------------------------------------------------
# 8. CREATE DATAFRAME
# ---------------------------------------------------------

ml_df = pd.DataFrame(training_rows)


print("\n" + "=" * 70)
print("DATASET GENERATION RESULT")
print("=" * 70)

print("\nML training rows:", len(ml_df))


# ---------------------------------------------------------
# 9. CHECK WHETHER DATA WAS CREATED
# ---------------------------------------------------------

if ml_df.empty:

    print("\nERROR: No ML training rows were created.")

    raise SystemExit(
        "Training dataset is empty."
    )


# ---------------------------------------------------------
# 10. REMOVE DUPLICATES
# ---------------------------------------------------------

before_duplicates = len(ml_df)

ml_df = ml_df.drop_duplicates().reset_index(drop=True)

print(
    "Duplicate rows removed:",
    before_duplicates - len(ml_df)
)


# ---------------------------------------------------------
# 11. VALIDATION
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("ML DATASET VALIDATION")
print("=" * 70)


print("\nFinal rows:", len(ml_df))
print("Final columns:", len(ml_df.columns))


# Missing values
missing = ml_df.isna().sum()

missing = missing[missing > 0]

print("\nMissing values:")

if missing.empty:
    print("None")
else:
    print(missing)


# Negative current delays
negative_current = (
    ml_df["current_delay_minutes"] < 0
).sum()

print(
    "\nNegative current delays:",
    negative_current
)


# Negative target delays
negative_target = (
    ml_df["target_delay_minutes"] < 0
).sum()

print(
    "Negative target delays:",
    negative_target
)


# Invalid station sequences
invalid_sequences = (
    ml_df["future_station_sequence"]
    <= ml_df["station_sequence"]
).sum()

print(
    "Invalid station sequences:",
    invalid_sequences
)


# Same station
same_station = (
    ml_df["station_code"]
    == ml_df["future_station_code"]
).sum()

print(
    "Same current/future station:",
    same_station
)


# ---------------------------------------------------------
# 12. TARGET STATISTICS
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("TARGET STATISTICS")
print("=" * 70)

print(
    ml_df["target_delay_minutes"].describe()
)


# ---------------------------------------------------------
# 13. SAMPLE DATA
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("SAMPLE TRAINING DATA")
print("=" * 70)

sample_columns = [
    "train_number",
    "station_code",
    "station_sequence",
    "current_delay_minutes",
    "future_station_code",
    "future_station_sequence",
    "prediction_horizon_minutes",
    "target_delay_minutes",
    "target_delay_change_minutes"
]

print(
    ml_df[sample_columns]
    .head(15)
    .to_string(index=False)
)


# ---------------------------------------------------------
# 14. SAVE DATASET
# ---------------------------------------------------------

output_path.parent.mkdir(
    parents=True,
    exist_ok=True
)

ml_df.to_csv(
    output_path,
    index=False
)


# ---------------------------------------------------------
# 15. FINAL MESSAGE
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("SUCCESS")
print("=" * 70)

print(
    "\nML dataset saved to:"
)

print(output_path)

print(
    "\nReady for feature engineering and model training."
)

print("=" * 70)