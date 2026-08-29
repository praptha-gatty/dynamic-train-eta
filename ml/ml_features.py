import pandas as pd
import numpy as np
from datetime import datetime, timezone
import pytz

IST = pytz.timezone("Asia/Kolkata")
DEFAULT_SMOOTH_SPEED_KMPH = 45.0

def convert_to_ist(dt_series):
    """
    Convert a pandas DatetimeSeries to Asia/Kolkata (IST) timezone.
    Prevents timezone comparison crashes.
    """
    dt = pd.to_datetime(dt_series, utc=True, errors="coerce")
    return dt.dt.tz_convert(IST)

def handle_midnight_rollover(diff_minutes):
    """
    Adjusts time difference minutes for midnight boundary crossings.
    e.g., scheduled 23:45, arriving 00:15 => +30 minutes instead of -1410 minutes.
    """
    if isinstance(diff_minutes, (pd.Series, np.ndarray)):
        res = diff_minutes.copy()
        res = np.where(res < -720, res + 1440, res)
        res = np.where(res > 720, res - 1440, res)
        return res
    else:
        if diff_minutes < -720:
            return diff_minutes + 1440
        elif diff_minutes > 720:
            return diff_minutes - 1440
        return diff_minutes

def apply_speed_smoothing(df, default_speed=DEFAULT_SMOOTH_SPEED_KMPH, window=3):
    """
    Applies speed smoothing to prevent ZeroDivisionError.
    Uses rolling average velocity and falls back to default_speed (45 km/h) if 0 or NaN.
    """
    df_out = df.copy()
    if "speed_kmph" not in df_out.columns:
        df_out["speed_kmph"] = default_speed

    # Replace 0 or negative speeds with NaN temporarily for rolling calculation
    raw_speed = df_out["speed_kmph"].astype(float)
    valid_speed = raw_speed.where(raw_speed > 0, np.nan)

    # Compute rolling mean over group
    if "train_number" in df_out.columns:
        rolling_speed = df_out.groupby("train_number")["speed_kmph"].transform(
            lambda s: s.where(s > 0, np.nan).rolling(window=window, min_periods=1).mean()
        )
    else:
        rolling_speed = valid_speed.rolling(window=window, min_periods=1).mean()

    # Effective speed: fallback to rolling_speed or default_speed
    effective_speed = valid_speed.fillna(rolling_speed).fillna(default_speed)
    df_out["effective_speed_kmph"] = effective_speed.clip(lower=10.0, upper=160.0)
    return df_out

def prepare_ml_features(df):
    """
    Transforms raw train history dataframe into ML model features.
    """
    if df.empty:
        return df

    df_proc = df.copy()

    # 1. Standardize Timestamps to IST
    for col in ["scheduled_arrival", "actual_arrival", "scheduled_departure", "actual_departure", "captured_at"]:
        if col in df_proc.columns:
            df_proc[f"{col}_ist"] = convert_to_ist(df_proc[col])

    # 2. Time Features
    if "captured_at_ist" in df_proc.columns:
        df_proc["hour_of_day"] = df_proc["captured_at_ist"].dt.hour
        df_proc["day_of_week"] = df_proc["captured_at_ist"].dt.dayofweek
        df_proc["is_weekend"] = df_proc["day_of_week"].isin([5, 6]).astype(int)

    # 3. Delays & Midnight Rollover
    if "delay_minutes" not in df_proc.columns:
        df_proc["delay_minutes"] = 0
    df_proc["delay_minutes"] = df_proc["delay_minutes"].fillna(0).astype(float)

    # 4. Distance Metrics
    df_proc["distance_from_origin_km"] = df_proc.get("distance_from_origin_km", pd.Series(0)).fillna(0).astype(float)
    df_proc["distance_remaining_km"] = df_proc.get("distance_remaining_km", pd.Series(0)).fillna(0).astype(float)

    # 5. Speed Smoothing
    df_proc = apply_speed_smoothing(df_proc)

    # 6. Calculated Horizon (hours) without division by zero
    df_proc["time_horizon_hours"] = df_proc["distance_remaining_km"] / df_proc["effective_speed_kmph"]

    return df_proc
