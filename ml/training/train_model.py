import pandas as pd
import numpy as np
import joblib

from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


print("=" * 70)
print("TRAINING DYNAMIC TRAIN ETA MODEL")
print("=" * 70)


# ---------------------------------------------------------
# 1. PATHS
# ---------------------------------------------------------

input_path = Path(
    "ml/feature_engineering/features_ready.csv"
)

model_path = Path(
    "ml/models/dynamic_train_eta_model.pkl"
)

metrics_path = Path(
    "ml/models/model_metrics.txt"
)


# ---------------------------------------------------------
# 2. LOAD DATA
# ---------------------------------------------------------

print("\nLoading feature dataset...")

df = pd.read_csv(input_path)

print("Rows:", len(df))
print("Columns:", len(df.columns))


# ---------------------------------------------------------
# 3. TARGET
# ---------------------------------------------------------

target_column = "target_delay_minutes"

if target_column not in df.columns:
    raise SystemExit(
        "ERROR: Target column not found."
    )


X = df.drop(
    columns=[target_column]
)

y = df[target_column]


print("\nTarget:", target_column)

print(
    "Target mean:",
    round(y.mean(), 2)
)

print(
    "Target median:",
    round(y.median(), 2)
)


# ---------------------------------------------------------
# 4. IDENTIFY COLUMN TYPES
# ---------------------------------------------------------

categorical_columns = X.select_dtypes(
    include=["object", "bool"]
).columns.tolist()

numeric_columns = X.select_dtypes(
    include=["int64", "float64"]
).columns.tolist()


print("\nCategorical features:")

for column in categorical_columns:
    print("-", column)


print("\nNumeric features:")

for column in numeric_columns:
    print("-", column)


# ---------------------------------------------------------
# 5. TRAIN / TEST SPLIT
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("TRAIN / TEST SPLIT")
print("=" * 70)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)


print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# ---------------------------------------------------------
# 6. PREPROCESSING
# ---------------------------------------------------------

print("\nCreating preprocessing pipeline...")


# Numeric preprocessing
numeric_transformer = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="median")
        )
    ]
)


# Categorical preprocessing
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


# ---------------------------------------------------------
# 7. BASELINE MODEL
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("BASELINE MODEL")
print("=" * 70)

baseline_pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),
        (
            "model",
            DummyRegressor(
                strategy="mean"
            )
        )
    ]
)


baseline_pipeline.fit(
    X_train,
    y_train
)


baseline_predictions = (
    baseline_pipeline.predict(X_test)
)


baseline_mae = mean_absolute_error(
    y_test,
    baseline_predictions
)

baseline_rmse = np.sqrt(
    mean_squared_error(
        y_test,
        baseline_predictions
    )
)

baseline_r2 = r2_score(
    y_test,
    baseline_predictions
)


print("\nBaseline results:")

print(
    "MAE :",
    round(baseline_mae, 3),
    "minutes"
)

print(
    "RMSE:",
    round(baseline_rmse, 3),
    "minutes"
)

print(
    "R²  :",
    round(baseline_r2, 3)
)


# ---------------------------------------------------------
# 8. RANDOM FOREST MODEL
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("RANDOM FOREST MODEL")
print("=" * 70)

random_forest = RandomForestRegressor(
    n_estimators=300,
    max_depth=15,
    min_samples_split=4,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)


model_pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),
        (
            "model",
            random_forest
        )
    ]
)


print("\nTraining Random Forest...")

model_pipeline.fit(
    X_train,
    y_train
)

print("Training completed.")


# ---------------------------------------------------------
# 9. PREDICTIONS
# ---------------------------------------------------------

print("\nGenerating test predictions...")

predictions = model_pipeline.predict(
    X_test
)


# ---------------------------------------------------------
# 10. MODEL METRICS
# ---------------------------------------------------------

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

r2 = r2_score(
    y_test,
    predictions
)


print("\n" + "=" * 70)
print("MODEL RESULTS")
print("=" * 70)

print(
    "\nMean Absolute Error (MAE):",
    round(mae, 3),
    "minutes"
)

print(
    "Root Mean Squared Error (RMSE):",
    round(rmse, 3),
    "minutes"
)

print(
    "R² Score:",
    round(r2, 3)
)


# ---------------------------------------------------------
# 11. BASELINE COMPARISON
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("BASELINE vs RANDOM FOREST")
print("=" * 70)

print(
    "\nBaseline MAE :",
    round(baseline_mae, 3)
)

print(
    "Model MAE    :",
    round(mae, 3)
)

print(
    "\nBaseline RMSE:",
    round(baseline_rmse, 3)
)

print(
    "Model RMSE   :",
    round(rmse, 3)
)

print(
    "\nBaseline R²  :",
    round(baseline_r2, 3)
)

print(
    "Model R²     :",
    round(r2, 3)
)


# ---------------------------------------------------------
# 12. SAMPLE PREDICTIONS
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("SAMPLE PREDICTIONS")
print("=" * 70)

comparison = pd.DataFrame({

    "Actual_delay": y_test.values[:15],

    "Predicted_delay":
        predictions[:15]

})

comparison["Error"] = (
    comparison["Predicted_delay"]
    - comparison["Actual_delay"]
)


print(
    comparison.to_string(
        index=False
    )
)


# ---------------------------------------------------------
# 13. SAVE MODEL
# ---------------------------------------------------------

model_path.parent.mkdir(
    parents=True,
    exist_ok=True
)

joblib.dump(
    model_pipeline,
    model_path
)


# ---------------------------------------------------------
# 14. SAVE METRICS
# ---------------------------------------------------------

metrics_path.parent.mkdir(
    parents=True,
    exist_ok=True
)

with open(
    metrics_path,
    "w"
) as file:

    file.write(
        "DYNAMIC TRAIN ETA MODEL RESULTS\n"
    )

    file.write(
        "=" * 50 + "\n\n"
    )

    file.write(
        f"Training samples: {len(X_train)}\n"
    )

    file.write(
        f"Testing samples: {len(X_test)}\n\n"
    )

    file.write(
        "BASELINE MODEL\n"
    )

    file.write(
        f"MAE: {baseline_mae:.4f}\n"
    )

    file.write(
        f"RMSE: {baseline_rmse:.4f}\n"
    )

    file.write(
        f"R2: {baseline_r2:.4f}\n\n"
    )

    file.write(
        "RANDOM FOREST MODEL\n"
    )

    file.write(
        f"MAE: {mae:.4f}\n"
    )

    file.write(
        f"RMSE: {rmse:.4f}\n"
    )

    file.write(
        f"R2: {r2:.4f}\n"
    )


# ---------------------------------------------------------
# 15. FINAL MESSAGE
# ---------------------------------------------------------

print("\n" + "=" * 70)
print("SUCCESS")
print("=" * 70)

print(
    "\nModel saved to:"
)

print(model_path)

print(
    "\nMetrics saved to:"
)

print(metrics_path)

print(
    "\nTraining completed successfully."
)

print("=" * 70)