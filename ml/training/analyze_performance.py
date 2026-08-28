import pandas as pd
import numpy as np

from pathlib import Path


print("=" * 70)
print("ANALYZING MODEL PERFORMANCE BY JOURNEY DATE")
print("=" * 70)


# ---------------------------------------------------------
# 1. LOAD DATA
# ---------------------------------------------------------

input_path = Path(
    "ml/data_processing/train_ml_ready.csv"
)

df = pd.read_csv(input_path)

print("\nTotal rows:", len(df))


# ---------------------------------------------------------
# 2. CONVERT DATE
# ---------------------------------------------------------

df["journey_date"] = pd.to_datetime(
    df["journey_date"],
    errors="coerce"
)

df = df.dropna(
    subset=["journey_date"]
).copy()


# ---------------------------------------------------------
# 3. DATE-WISE DATA DISTRIBUTION
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("DATA DISTRIBUTION BY JOURNEY DATE")
print("=" * 70)

date_summary = (
    df.groupby("journey_date")
    .agg(
        samples=("target_delay_minutes", "count"),
        mean_delay=("target_delay_minutes", "mean"),
        median_delay=("target_delay_minutes", "median"),
        max_delay=("target_delay_minutes", "max"),
        zero_delay_percent=(
            "target_delay_minutes",
            lambda x: (x == 0).mean() * 100
        )
    )
    .reset_index()
)


date_summary["mean_delay"] = (
    date_summary["mean_delay"].round(2)
)

date_summary["median_delay"] = (
    date_summary["median_delay"].round(2)
)

date_summary["zero_delay_percent"] = (
    date_summary["zero_delay_percent"].round(2)
)


print(
    date_summary.to_string(
        index=False
    )
)


# ---------------------------------------------------------
# 4. PREDICTION HORIZON BY DATE
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("PREDICTION HORIZON BY JOURNEY DATE")
print("=" * 70)


horizon_summary = (
    df.groupby("journey_date")
    .agg(
        average_horizon=(
            "prediction_horizon_minutes",
            "mean"
        ),

        median_horizon=(
            "prediction_horizon_minutes",
            "median"
        ),

        minimum_horizon=(
            "prediction_horizon_minutes",
            "min"
        ),

        maximum_horizon=(
            "prediction_horizon_minutes",
            "max"
        )
    )
    .reset_index()
)


horizon_summary = horizon_summary.round(2)


print(
    horizon_summary.to_string(
        index=False
    )
)


# ---------------------------------------------------------
# 5. CURRENT DELAY BY DATE
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("CURRENT DELAY BY JOURNEY DATE")
print("=" * 70)


current_delay_summary = (
    df.groupby("journey_date")
    .agg(
        mean_current_delay=(
            "current_delay_minutes",
            "mean"
        ),

        median_current_delay=(
            "current_delay_minutes",
            "median"
        ),

        max_current_delay=(
            "current_delay_minutes",
            "max"
        )
    )
    .reset_index()
)


current_delay_summary = (
    current_delay_summary.round(2)
)


print(
    current_delay_summary.to_string(
        index=False
    )
)


# ---------------------------------------------------------
# 6. SPEED BY DATE
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("SPEED DISTRIBUTION BY JOURNEY DATE")
print("=" * 70)


speed_summary = (
    df.groupby("journey_date")
    .agg(
        mean_speed=(
            "current_speed_kmph",
            "mean"
        ),

        median_speed=(
            "current_speed_kmph",
            "median"
        )
    )
    .reset_index()
)


speed_summary = (
    speed_summary.round(2)
)


print(
    speed_summary.to_string(
        index=False
    )
)


# ---------------------------------------------------------
# 7. STATION COVERAGE
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("STATION COVERAGE BY JOURNEY DATE")
print("=" * 70)


station_summary = (
    df.groupby("journey_date")
    .agg(
        unique_stations=(
            "station_code",
            "nunique"
        ),

        unique_trains=(
            "train_number",
            "nunique"
        )
    )
    .reset_index()
)


print(
    station_summary.to_string(
        index=False
    )
)


# ---------------------------------------------------------
# 8. TARGET DISTRIBUTION
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("OVERALL TARGET DISTRIBUTION")
print("=" * 70)


target = df[
    "target_delay_minutes"
]


print(
    target.describe()
)


print(
    "\nZero-delay samples:",
    (target == 0).sum()
)


print(
    "Zero-delay percentage:",
    round(
        (target == 0).mean() * 100,
        2
    ),
    "%"
)


# ---------------------------------------------------------
# 9. TARGET DISTRIBUTION BY RANGE
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("TARGET DELAY RANGES")
print("=" * 70)


bins = [
    -1,
    0,
    5,
    10,
    20,
    30,
    60,
    120,
    200
]


labels = [
    "0 min",
    "1-5 min",
    "6-10 min",
    "11-20 min",
    "21-30 min",
    "31-60 min",
    "61-120 min",
    "121-200 min"
]


ranges = pd.cut(
    target,
    bins=bins,
    labels=labels
)


print(
    ranges.value_counts(
        sort=False
    )
)


# ---------------------------------------------------------
# 10. FINAL INTERPRETATION
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("ANALYSIS COMPLETE")
print("=" * 70)


print(
    """
We are checking whether differences in model
performance between journey dates are related to:

1. Number of training samples
2. Delay distribution
3. Prediction horizon
4. Current delay
5. Speed
6. Number of trains/stations
7. Large number of zero-delay targets

No dataset or model files were modified.
"""
)


print("=" * 70)