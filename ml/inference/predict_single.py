import sys
import os
import json
from pathlib import Path
import pandas as pd
import joblib

MODEL_PATHS = [
    Path(__file__).parent.parent / "models" / "dynamic_train_eta_model.pkl",
    Path(__file__).parent.parent / "models" / "dynamic_train_eta_realistic_model.pkl"
]

def load_rf_model():
    for p in MODEL_PATHS:
        if p.exists():
            try:
                return joblib.load(p)
            except Exception:
                continue
    return None

def predict_single(features):
    model = load_rf_model()
    if model is None:
        return {
            "status": "error",
            "error": "Model file not found or could not be loaded"
        }

    # Prepare input DataFrame with standard feature columns
    delay = float(features.get("current_delay", features.get("delay_minutes", 0)))
    speed = float(features.get("effective_speed", features.get("speed_kmph", 45)))
    seq = int(features.get("station_sequence", features.get("sequence", 1)))
    dist_origin = float(features.get("distance_from_origin_km", features.get("distance_from_source_km", 0)))
    dist_rem = float(features.get("distance_remaining_km", 0))
    hour = int(features.get("hour_of_day", 12))
    day = int(features.get("day_of_week", 2))
    is_weekend = int(features.get("is_weekend", 0))

    feature_dict = {
        "station_sequence": seq,
        "distance_from_origin_km": dist_origin,
        "distance_remaining_km": dist_rem,
        "effective_speed_kmph": speed,
        "delay_minutes": delay,
        "hour_of_day": hour,
        "day_of_week": day,
        "is_weekend": is_weekend
    }

    try:
        X_input = pd.DataFrame([feature_dict])
        predicted_added_delay = float(model.predict(X_input)[0])
        return {
            "status": "success",
            "predicted_added_delay_minutes": round(predicted_added_delay, 2),
            "model": "RandomForestRegressor"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            res = predict_single(input_data)
            print(json.dumps(res))
        except Exception as err:
            print(json.dumps({"status": "error", "error": str(err)}))
    else:
        # Read from stdin
        try:
            raw = sys.stdin.read().strip()
            input_data = json.loads(raw) if raw else {}
            res = predict_single(input_data)
            print(json.dumps(res))
        except Exception as err:
            print(json.dumps({"status": "error", "error": str(err)}))
