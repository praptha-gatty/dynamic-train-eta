import pandas as pd
from pathlib import Path

print("=" * 70)
print("FEATURE ENGINEERING")
print("=" * 70)


# ---------------------------------------------------------
# 1. PATHS
# ---------------------------------------------------------

input_path = Path("ml/data_processing/train_ml_ready.csv")
output_path = Path("ml/feature_engineering/features_ready.csv")


# ---------------------------------------------------------
# 2. LOAD DATA
# ---------------------------------------------------------

print("\nLoading ML dataset...")

df = pd.read_csv(input_path)

print("Rows:", len(df))
print("Columns:", len(df.columns))


# ---------------------------------------------------------
# 3. CHECK DATA
# ---------------------------------------------------------

print("\nChecking missing values...")

missing = df.isna().sum()
missing = missing[missing > 0]

if missing.empty:
    print("No missing values.")
else:
    print(missing)


# ---------------------------------------------------------
# 4. HANDLE MISSING FUTURE SPEED
# ---------------------------------------------------------
# We will NOT use future_speed_kmph as a model feature
# because it is information from the future.
# Therefore, we simply remove it later.
# ---------------------------------------------------------


# ---------------------------------------------------------
# 5. CREATE USEFUL FEATURES
# ---------------------------------------------------------

print("\nCreating engineered features...")


DEFAULT_AVG_SPEED_KMPH = 45.0
effective_speed = df["current_speed_kmph"].apply(
    lambda s: float(s) if (pd.notna(s) and float(s) > 0) else DEFAULT_AVG_SPEED_KMPH
)

# Distance covered / route position
df["route_progress"] = (
    df["station_sequence"]
    / df["future_station_sequence"].replace(0, 1)
)


# Station gap
df["station_gap"] = (
    df["future_station_sequence"]
    - df["station_sequence"]
)


# Delay × horizon interaction
df["delay_horizon_interaction"] = (
    df["current_delay_minutes"].fillna(0)
    * df["prediction_horizon_minutes"]
)


# Speed × horizon approximation (using smoothed effective speed)
df["speed_horizon_distance"] = (
    effective_speed
    * df["prediction_horizon_minutes"]
    / 60
)


# ---------------------------------------------------------
# 6. SELECT FEATURES
# ---------------------------------------------------------
#
# IMPORTANT:
# We deliberately DO NOT use:
#
# future_speed_kmph
# future_distance_remaining_km
# future_distance_from_origin_km
# future_captured_at
# target_delay_minutes
# target_delay_change_minutes
#
# because those contain future/target information.
# ---------------------------------------------------------

feature_columns = [

    # Current train state
    "train_number",

    # Current station
    "station_code",
    "station_sequence",

    # Current delay/state
    "current_delay_minutes",
    "current_speed_kmph",
    "current_distance_from_origin_km",
    "current_distance_remaining_km",

    # Operational state
    "station_status",
    "running_status",
    "is_halt",

    # Time
    "day_of_week",
    "hour",
    "minute",
    "month",
    "time_period",
    "is_weekend",

    # Prediction horizon
    "prediction_horizon_minutes",

    # Future destination/station context
    "future_station_code",
    "future_station_sequence",

    # Engineered features
    "route_progress",
    "station_gap",
    "delay_horizon_interaction",
    "speed_horizon_distance"
]


# ---------------------------------------------------------
# 7. CHECK FEATURES
# ---------------------------------------------------------

missing_features = [
    col for col in feature_columns
    if col not in df.columns
]

if missing_features:

    print("\nERROR: Missing feature columns:")

    for col in missing_features:
        print("-", col)

    raise SystemExit(
        "Feature columns are missing."
    )


# ---------------------------------------------------------
# 8. CREATE FEATURE DATAFRAME
# ---------------------------------------------------------

X = df[feature_columns].copy()

y = df["target_delay_minutes"].copy()


# ---------------------------------------------------------
# 9. HANDLE MISSING VALUES
# ---------------------------------------------------------

print("\nHandling missing feature values...")

numeric_columns = X.select_dtypes(
    include=["int64", "float64"]
).columns

categorical_columns = X.select_dtypes(
    include=["object", "bool"]
).columns


# Numeric → median
for column in numeric_columns:

    if X[column].isna().any():

        median_value = X[column].median()

        X[column] = X[column].fillna(
            median_value
        )


# Categorical → most common value
for column in categorical_columns:

    if X[column].isna().any():

        mode_value = X[column].mode()

        if len(mode_value) > 0:

            X[column] = X[column].fillna(
                mode_value.iloc[0]
            )


# ---------------------------------------------------------
# 10. FINAL CHECK
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("FEATURE DATASET")
print("=" * 70)

print("\nFeature rows:", len(X))
print("Number of features:", len(X.columns))

print("\nFeature columns:")

for column in X.columns:
    print("-", column)


print("\nRemaining missing values:")

remaining_missing = X.isna().sum()
remaining_missing = remaining_missing[
    remaining_missing > 0
]

if remaining_missing.empty:
    print("None")
else:
    print(remaining_missing)


# ---------------------------------------------------------
# 11. TARGET
# ---------------------------------------------------------

print("\nTarget variable:")
print("target_delay_minutes")

print("\nTarget statistics:")
print(y.describe())


# ---------------------------------------------------------
# 12. SAVE FEATURE DATASET
# ---------------------------------------------------------

output_path.parent.mkdir(
    parents=True,
    exist_ok=True
)

feature_df = X.copy()

feature_df["target_delay_minutes"] = y

feature_df.to_csv(
    output_path,
    index=False
)


# ---------------------------------------------------------
# 13. SUCCESS
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("SUCCESS")
print("=" * 70)

print("\nFeature dataset saved to:")

print(output_path)

print("\nReady for model training.")

print("=" * 70)