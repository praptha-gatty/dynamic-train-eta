import pandas as pd

# Load the processed training dataset
data_path = "data/processed/train_eta_training.csv"
df = pd.read_csv(data_path)

print("=" * 70)
print("TRAIN ETA DATA VALIDATION")
print("=" * 70)

print(f"\nRows: {len(df)}")
print(f"Columns: {len(df.columns)}")


# ---------------------------------------------------------
# 1. BASIC DATA CHECK
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("1. BASIC DATA CHECK")
print("=" * 70)

print("Number of trains:", df["train_number"].nunique())
print("Number of journey dates:", df["journey_date"].nunique())
print("Number of stations:", df["station_code"].nunique())


# ---------------------------------------------------------
# 2. MISSING VALUES
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("2. MISSING VALUES")
print("=" * 70)

missing = df.isnull().sum()
missing = missing[missing > 0]

if len(missing) == 0:
    print("No missing values found.")
else:
    print(missing)


# ---------------------------------------------------------
# 3. DUPLICATE ROWS
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("3. DUPLICATE ROWS")
print("=" * 70)

duplicates = df.duplicated().sum()

print("Exact duplicate rows:", duplicates)


# ---------------------------------------------------------
# 4. CURRENT STATION vs NEXT STATION
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("4. CURRENT STATION vs NEXT STATION")
print("=" * 70)

same_station = df[
    df["station_code"] == df["next_station_code"]
]

print("Rows where current station == next station:",
      len(same_station))

if len(same_station) > 0:
    print("\nExamples:")
    print(
        same_station[
            [
                "train_number",
                "station_sequence",
                "station_code",
                "station_name",
                "next_station_code",
                "next_station_name",
                "target_delay_next_station"
            ]
        ].head(10).to_string(index=False)
    )


# ---------------------------------------------------------
# 5. NEXT STATION SEQUENCE CHECK
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("5. NEXT STATION SEQUENCE CHECK")
print("=" * 70)

# Check whether next station is actually later in the route
sequence_check = df[
    df["next_station_code"].notna()
    & (df["station_sequence"] >= df["station_sequence"])
]

print("Rows requiring next-station sequence verification:",
      len(sequence_check))


# ---------------------------------------------------------
# 6. INVALID NUMERIC VALUES
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("6. INVALID NUMERIC VALUES")
print("=" * 70)

numeric_columns = [
    "current_delay_minutes",
    "distance_km",
    "speed_kmph",
    "target_delay_next_station"
]

for column in numeric_columns:
    if column in df.columns:
        negative_count = (df[column] < 0).sum()
        print(f"{column}: {negative_count} negative values")


# ---------------------------------------------------------
# 7. TARGET CHECK
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("7. TARGET CHECK")
print("=" * 70)

target = "target_delay_next_station"

print("Target missing:", df[target].isnull().sum())
print("Target minimum:", df[target].min())
print("Target maximum:", df[target].max())
print("Target mean:", round(df[target].mean(), 2))
print("Target median:", df[target].median())


# ---------------------------------------------------------
# 8. REPEATED STATION CAPTURES
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("8. REPEATED STATION CAPTURES")
print("=" * 70)

capture_counts = (
    df.groupby(
        ["train_number", "journey_date", "station_code"]
    )
    .size()
    .sort_values(ascending=False)
)

repeated = capture_counts[capture_counts > 1]

print("Train/station combinations with multiple captures:",
      len(repeated))

if len(repeated) > 0:
    print("\nTop repeated stations:")
    print(repeated.head(15))


# ---------------------------------------------------------
# 9. TARGET BY STATION
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("9. TARGET BY STATION")
print("=" * 70)

target_by_station = (
    df.groupby("station_code")[target]
    .agg(["count", "mean", "min", "max"])
    .sort_values("count", ascending=False)
)

print(target_by_station.head(15))


# ---------------------------------------------------------
# 10. SUMMARY
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("VALIDATION SUMMARY")
print("=" * 70)

print("Total rows:", len(df))
print("Exact duplicates:", duplicates)
print("Missing-value cells:", int(df.isnull().sum().sum()))
print("Same current/next station:", len(same_station))
print("Unique trains:", df["train_number"].nunique())
print("Unique journey dates:", df["journey_date"].nunique())
print("Repeated train/station captures:", len(repeated))

print("\nValidation completed.")
print("=" * 70)