import pandas as pd
import numpy as np

from pathlib import Path

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

from sklearn.ensemble import RandomForestRegressor

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


print("=" * 70)
print("MULTI-DATE REALISTIC MODEL EVALUATION")
print("=" * 70)


# ---------------------------------------------------------
# 1. PATH
# ---------------------------------------------------------

input_path = Path(
    "ml/data_processing/train_ml_ready.csv"
)


# ---------------------------------------------------------
# 2. LOAD DATA
# ---------------------------------------------------------

print("\nLoading ML dataset...")

df = pd.read_csv(input_path)

print("Total rows:", len(df))
print("Total columns:", len(df.columns))


# ---------------------------------------------------------
# 3. CHECK REQUIRED COLUMNS
# ---------------------------------------------------------

required_columns = [
    "train_number",
    "journey_date",
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
    "future_station_sequence",
    "target_delay_minutes"
]


missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]


if missing_columns:

    print("\nERROR: Missing columns:")

    for column in missing_columns:
        print("-", column)

    raise SystemExit()


print("\nAll required columns are available.")


# ---------------------------------------------------------
# 4. CONVERT JOURNEY DATE
# ---------------------------------------------------------

df["journey_date"] = pd.to_datetime(
    df["journey_date"],
    errors="coerce"
)


df = df[
    df["journey_date"].notna()
].copy()


# ---------------------------------------------------------
# 5. CREATE ENGINEERED FEATURES
# ---------------------------------------------------------

print("\nCreating engineered features...")


df["route_progress"] = (
    df["station_sequence"]
    /
    df["future_station_sequence"].replace(
        0,
        1
    )
)


df["station_gap"] = (
    df["future_station_sequence"]
    -
    df["station_sequence"]
)


df["delay_horizon_interaction"] = (
    df["current_delay_minutes"]
    *
    df["prediction_horizon_minutes"]
)


df["speed_horizon_distance"] = (
    df["current_speed_kmph"]
    *
    df["prediction_horizon_minutes"]
    /
    60
)


# ---------------------------------------------------------
# 6. GET JOURNEY DATES
# ---------------------------------------------------------

unique_dates = sorted(
    df["journey_date"].unique()
)


print("\nAvailable journey dates:")

for date in unique_dates:
    print("-", date)


if len(unique_dates) < 3:

    raise SystemExit(
        "\nERROR: At least 3 journey dates are required."
    )


# ---------------------------------------------------------
# 7. FEATURES
# ---------------------------------------------------------

target_column = "target_delay_minutes"


feature_columns = [

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
    "future_station_sequence",

    "route_progress",
    "station_gap",
    "delay_horizon_interaction",
    "speed_horizon_distance"
]


# ---------------------------------------------------------
# 8. FUNCTION TO TRAIN + TEST ONE DATE
# ---------------------------------------------------------

def evaluate_test_date(test_date):

    print("\n")
    print("=" * 70)
    print("TESTING JOURNEY DATE:", test_date)
    print("=" * 70)


    # Earlier dates → training
    train_df = df[
        df["journey_date"] < test_date
    ].copy()


    # Current date → testing
    test_df = df[
        df["journey_date"] == test_date
    ].copy()


    print("\nTraining rows:", len(train_df))
    print("Testing rows:", len(test_df))


    if len(train_df) == 0 or len(test_df) == 0:

        print("Skipping this date.")

        return None


    X_train = train_df[
        feature_columns
    ].copy()

    y_train = train_df[
        target_column
    ].copy()


    X_test = test_df[
        feature_columns
    ].copy()

    y_test = test_df[
        target_column
    ].copy()


    # -----------------------------------------------------
    # FEATURE TYPES
    # -----------------------------------------------------

    categorical_columns = X_train.select_dtypes(
        include=["object", "bool"]
    ).columns.tolist()


    numeric_columns = X_train.select_dtypes(
        include=["int64", "float64"]
    ).columns.tolist()


    # -----------------------------------------------------
    # PREPROCESSING
    # -----------------------------------------------------

    numeric_transformer = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(
                    strategy="median"
                )
            )
        ]
    )


    categorical_transformer = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(
                    strategy="most_frequent"
                )
            ),
            (
                "onehot",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False
                )
            )
        ]
    )


    preprocessor = ColumnTransformer(
        transformers=[

            (
                "numeric",
                numeric_transformer,
                numeric_columns
            ),

            (
                "categorical",
                categorical_transformer,
                categorical_columns
            )
        ]
    )


    # -----------------------------------------------------
    # RANDOM FOREST
    # -----------------------------------------------------

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )


    pipeline = Pipeline(
        steps=[

            (
                "preprocessor",
                preprocessor
            ),

            (
                "model",
                model
            )
        ]
    )


    # -----------------------------------------------------
    # TRAIN
    # -----------------------------------------------------

    print("\nTraining model...")

    pipeline.fit(
        X_train,
        y_train
    )


    # -----------------------------------------------------
    # PREDICT
    # -----------------------------------------------------

    predictions = pipeline.predict(
        X_test
    )


    # -----------------------------------------------------
    # METRICS
    # -----------------------------------------------------

    mae = mean_absolute_error(
        y_test,
        predictions
    )


    rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions
        )
    )


    # R2 can be undefined if all actual values are identical
    if y_test.nunique() > 1:

        r2 = r2_score(
            y_test,
            predictions
        )

    else:

        r2 = np.nan


    print("\nRESULTS")

    print(
        "MAE :",
        round(mae, 3),
        "minutes"
    )

    print(
        "RMSE:",
        round(rmse, 3),
        "minutes"
    )

    if np.isnan(r2):

        print(
            "R²  : Not defined"
        )

    else:

        print(
            "R²  :",
            round(r2, 3)
        )


    return {
        "date": test_date,
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "mae": mae,
        "rmse": rmse,
        "r2": r2
    }


# ---------------------------------------------------------
# 9. EVALUATE MULTIPLE DATES
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("STARTING MULTI-DATE EVALUATION")
print("=" * 70)


results = []


# Start from second date because
# the first date has nothing before it for training.

for test_date in unique_dates[1:]:

    result = evaluate_test_date(
        test_date
    )

    if result is not None:

        results.append(
            result
        )


# ---------------------------------------------------------
# 10. RESULTS TABLE
# ---------------------------------------------------------

results_df = pd.DataFrame(
    results
)


print("\n" + "=" * 70)
print("MULTI-DATE RESULTS")
print("=" * 70)


if len(results_df) == 0:

    raise SystemExit(
        "\nNo evaluation results generated."
    )


print(
    results_df.to_string(
        index=False
    )
)


# ---------------------------------------------------------
# 11. OVERALL PERFORMANCE
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("OVERALL PERFORMANCE")
print("=" * 70)


overall_mae = (
    results_df["mae"]
    .mean()
)


overall_rmse = (
    results_df["rmse"]
    .mean()
)


valid_r2 = results_df[
    results_df["r2"].notna()
]["r2"]


if len(valid_r2) > 0:

    overall_r2 = valid_r2.mean()

else:

    overall_r2 = np.nan


print(
    "\nAverage MAE:",
    round(overall_mae, 3),
    "minutes"
)


print(
    "Average RMSE:",
    round(overall_rmse, 3),
    "minutes"
)


if np.isnan(overall_r2):

    print(
        "Average R²: Not defined"
    )

else:

    print(
        "Average R²:",
        round(overall_r2, 3)
    )


# ---------------------------------------------------------
# 12. SAVE RESULTS
# ---------------------------------------------------------

output_path = Path(
    "ml/models/multi_date_evaluation.txt"
)


output_path.parent.mkdir(
    parents=True,
    exist_ok=True
)


with open(
    output_path,
    "w"
) as file:

    file.write(
        "MULTI-DATE REALISTIC MODEL EVALUATION\n"
    )

    file.write(
        "=" * 60 + "\n\n"
    )


    file.write(
        results_df.to_string(
            index=False
        )
    )


    file.write(
        "\n\n"
    )


    file.write(
        f"Average MAE: {overall_mae:.4f} minutes\n"
    )


    file.write(
        f"Average RMSE: {overall_rmse:.4f} minutes\n"
    )


    if np.isnan(overall_r2):

        file.write(
            "Average R2: Not defined\n"
        )

    else:

        file.write(
            f"Average R2: {overall_r2:.4f}\n"
        )


print(
    "\nResults saved to:"
)

print(
    output_path
)


print("\n" + "=" * 70)
print("MULTI-DATE EVALUATION COMPLETED")
print("=" * 70)