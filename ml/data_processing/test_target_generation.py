import pandas as pd

print("=" * 70)
print("TESTING TRAINING-DATA GENERATION")
print("=" * 70)

# Load historical clean data
data_path = "data/processed/train_history_clean.csv"

df = pd.read_csv(data_path)

print("\nHistorical dataset shape:", df.shape)
print("Number of rows:", len(df))


# ---------------------------------------------------------
# 1. CHECK REQUIRED COLUMNS
# ---------------------------------------------------------

required_columns = [
    "train_number",
    "journey_date",
    "station_code",
    "station_sequence",
    "captured_at",
    "delay_minutes",
    "speed_kmph",
    "distance_from_origin_km"
]

print("\nChecking required columns...")

missing_columns = [
    column for column in required_columns
    if column not in df.columns
]

if missing_columns:
    print("Missing columns:")
    for column in missing_columns:
        print("-", column)

    raise SystemExit("Required columns are missing.")

print("All required columns are available.")


# ---------------------------------------------------------
# 2. CONVERT TIMESTAMP
# ---------------------------------------------------------

df["captured_at"] = pd.to_datetime(
    df["captured_at"],
    errors="coerce"
)

invalid_timestamps = df["captured_at"].isna().sum()

print("\nInvalid timestamps:", invalid_timestamps)

df = df.dropna(subset=["captured_at"]).copy()

print("Rows after timestamp check:", len(df))


# ---------------------------------------------------------
# 3. SORT CHRONOLOGICALLY
# ---------------------------------------------------------

df = df.sort_values(
    ["train_number", "journey_date", "captured_at"]
).reset_index(drop=True)


# ---------------------------------------------------------
# 4. FIND A VALID FUTURE STATION
# ---------------------------------------------------------

valid_samples = []

for i in range(len(df)):

    current = df.iloc[i]

    # Find future observations:
    # 1. Same train
    # 2. Same journey
    # 3. Later timestamp
    # 4. Later station sequence
    future = df[
        (df["train_number"] == current["train_number"])
        & (df["journey_date"] == current["journey_date"])
        & (df["captured_at"] > current["captured_at"])
        & (df["station_sequence"] > current["station_sequence"])
    ]

    if future.empty:
        continue

    # Choose the earliest valid future observation
    future = future.sort_values("captured_at").iloc[0]

    # Calculate time gap
    gap_minutes = (
        future["captured_at"] - current["captured_at"]
    ).total_seconds() / 60

    # Ignore invalid gaps
    if gap_minutes <= 0:
        continue

    # Only consider future observations within 60 minutes
    if gap_minutes > 60:
        continue

    valid_samples.append({
        "train_number": current["train_number"],
        "journey_date": current["journey_date"],

        "current_station": current["station_code"],
        "current_station_sequence": current["station_sequence"],

        "current_delay_minutes": current["delay_minutes"],
        "current_speed_kmph": current["speed_kmph"],
        "current_distance_km": current["distance_from_origin_km"],
        "current_captured_at": current["captured_at"],

        "future_station": future["station_code"],
        "future_station_sequence": future["station_sequence"],

        "future_delay_minutes": future["delay_minutes"],
        "future_captured_at": future["captured_at"],

        "actual_future_gap_minutes": gap_minutes,

        # Change in delay between current and future observation
        "target_delay_change_minutes": (
            future["delay_minutes"]
            - current["delay_minutes"]
        )
    })


# ---------------------------------------------------------
# 5. CREATE RESULT DATAFRAME
# ---------------------------------------------------------

result = pd.DataFrame(valid_samples)


# ---------------------------------------------------------
# 6. DISPLAY RESULTS
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("RESULT")
print("=" * 70)

print("Valid training samples found:", len(result))


if len(result) > 0:

    # -----------------------------------------------------
    # CURRENT → FUTURE STATION EXAMPLES
    # -----------------------------------------------------

    print("\nCurrent → Future station examples:")

    print(
        result[
            [
                "current_station",
                "current_station_sequence",
                "future_station",
                "future_station_sequence",
                "actual_future_gap_minutes",
                "target_delay_change_minutes"
            ]
        ]
        .head(15)
        .to_string(index=False)
    )


    # -----------------------------------------------------
    # CHECK STATION SEQUENCE
    # -----------------------------------------------------

    invalid_sequence = result[
        result["future_station_sequence"]
        <= result["current_station_sequence"]
    ]

    print(
        "\nInvalid station-sequence transitions:",
        len(invalid_sequence)
    )


    # -----------------------------------------------------
    # UNIQUE STATION TRANSITIONS
    # -----------------------------------------------------

    transitions = (
        result[
            [
                "current_station",
                "future_station"
            ]
        ]
        .drop_duplicates()
    )

    print(
        "\nUnique current → future station transitions:",
        len(transitions)
    )

    print("\nSample transitions:")

    print(
        transitions
        .head(20)
        .to_string(index=False)
    )


    # -----------------------------------------------------
    # TARGET STATISTICS
    # -----------------------------------------------------

    print("\nTarget delay-change statistics:")

    print(
        result["target_delay_change_minutes"]
        .describe()
    )


    # -----------------------------------------------------
    # SAME-STATION CHECK
    # -----------------------------------------------------

    same_station = result[
        result["current_station"]
        == result["future_station"]
    ]

    print(
        "\nFuture observations with same station:",
        len(same_station)
    )

    print(
        "Future observations with different station:",
        len(result) - len(same_station)
    )


else:

    print("\nNO VALID TRAINING SAMPLES FOUND.")


# ---------------------------------------------------------
# 7. FINAL SUMMARY
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("FINAL SUMMARY")
print("=" * 70)

print("Historical rows:", len(df))
print("Valid training samples:", len(result))

if len(result) > 0:
    print(
        "Invalid sequence transitions:",
        len(invalid_sequence)
    )

    print(
        "Same-station transitions:",
        len(same_station)
    )

print("\nTEST COMPLETED")
print("=" * 70)