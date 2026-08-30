import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
import pytz
from ml.ml_features import prepare_ml_features, IST, DEFAULT_SMOOTH_SPEED_KMPH

MODEL_PATHS = [
    os.path.join(os.path.dirname(__file__), "models", "dynamic_train_eta_model.pkl"),
    os.path.join(os.path.dirname(__file__), "models", "dynamic_train_eta_realistic_model.pkl"),
    os.path.join(os.path.dirname(__file__), "models", "rf_eta_model.joblib")
]

class ETAPredictor:
    def __init__(self, model_paths=MODEL_PATHS):
        self.model_paths = model_paths
        self.model = None
        self.load_model()

    def load_model(self):
        for path in self.model_paths:
            if os.path.exists(path):
                try:
                    self.model = joblib.load(path)
                    return
                except Exception:
                    continue
        self.model = None

    def predict_live_eta(self, train_history_df):
        """
        Takes raw/recent train_history records dataframe for a train journey
        and computes predicted arrival times for upcoming stations.
        """
        if train_history_df.empty:
            return []

        df_feat = prepare_ml_features(train_history_df)

        feature_cols = [
            "station_sequence",
            "distance_from_origin_km",
            "distance_remaining_km",
            "effective_speed_kmph",
            "delay_minutes",
            "hour_of_day",
            "day_of_week",
            "is_weekend"
        ]

        predictions = []
        now_ist = datetime.now(timezone.utc).astimezone(IST)

        for _, row in df_feat.iterrows():
            current_delay = float(row.get("delay_minutes", 0))
            dist_rem = float(row.get("distance_remaining_km", 0))
            eff_speed = float(row.get("effective_speed_kmph", DEFAULT_SMOOTH_SPEED_KMPH))

            # Base physical horizon in minutes
            base_travel_minutes = (dist_rem / max(10.0, eff_speed)) * 60.0

            if self.model and all(c in row for c in feature_cols):
                try:
                    X_input = pd.DataFrame([row[feature_cols]])
                    predicted_added_delay = float(self.model.predict(X_input)[0])
                except Exception:
                    predicted_added_delay = 0.0
            else:
                # Heuristic model fallback: delay propagation with buffer recovery
                predicted_added_delay = max(-current_delay * 0.2, current_delay * 0.05)

            total_predicted_delay_minutes = int(round(max(0, current_delay + predicted_added_delay)))
            predicted_arrival_dt = now_ist + timedelta(minutes=base_travel_minutes + predicted_added_delay)

            predictions.append({
                "history_id": row.get("history_id"),
                "station_code": row.get("station_code"),
                "station_sequence": row.get("station_sequence"),
                "current_station": row.get("current_station"),
                "current_delay_minutes": current_delay,
                "predicted_added_delay_minutes": round(predicted_added_delay, 1),
                "total_predicted_delay_minutes": total_predicted_delay_minutes,
                "effective_speed_kmph": round(eff_speed, 1),
                "distance_remaining_km": round(dist_rem, 1),
                "estimated_arrival_ist": predicted_arrival_dt.strftime("%I:%M %p"),
                "estimated_arrival_iso": predicted_arrival_dt.isoformat()
            })

        return predictions
