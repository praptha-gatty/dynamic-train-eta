import os
import time
import logging
import requests
from datetime import datetime, timezone
import pytz
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("IngestWorker")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
supabase: Client = create_client(SUPABASE_URL, key) if SUPABASE_URL and key else None
IST = pytz.timezone("Asia/Kolkata")

def fetch_with_retry(url, retries=3, backoff_factor=1.5, timeout=5):
    for i in range(retries):
        try:
            res = requests.get(url, timeout=timeout)
            if res.status_code == 200:
                return res.json()
            logger.warning(f"Fetch {url} HTTP {res.status_code}, attempt {i+1}/{retries}")
        except Exception as err:
            logger.warning(f"Fetch error {url}: {err}, attempt {i+1}/{retries}")
        if i < retries - 1:
            time.sleep(backoff_factor ** i)
    return None

def calculate_time_difference_minutes(actual_str, scheduled_str):
    if not actual_str or not scheduled_str:
        return None
    try:
        actual_ms = datetime.fromisoformat(actual_str.replace("Z", "+00:00")).timestamp() * 1000
        sched_ms = datetime.fromisoformat(scheduled_str.replace("Z", "+00:00")).timestamp() * 1000
        diff = int(round((actual_ms - sched_ms) / 60000.0))
        if diff < -720:
            diff += 1440
        elif diff > 720:
            diff -= 1440
        return diff
    except Exception:
        return None

def fetch_active_trains():
    if not supabase:
        return ["12919", "12920", "12921", "12922", "12923", "12924", "12925", "12926", "12927", "12928"]
    try:
        res = supabase.table("trains").select("train_number").execute()
        if res.data:
            trains = sorted(list(set(str(t["train_number"]).strip() for t in res.data if t.get("train_number"))))
            logger.info(f"Loaded {len(trains)} trains from Supabase: {trains}")
            return trains
    except Exception as e:
        logger.error(f"Error fetching active trains from Supabase: {e}")
    return ["12919", "12920", "12921", "12922", "12923", "12924", "12925", "12926", "12927", "12928"]

def process_train(train_number):
    url = f"https://railradar.in/api/v1/trains/{train_number}/live"
    data_wrapper = fetch_with_retry(url)
    if not data_wrapper or not data_wrapper.get("data"):
        logger.warning(f"No live data for train {train_number}")
        return 0

    data = data_wrapper["data"]
    train_name = data.get("trainName") or (data.get("train", {}) or {}).get("name")
    journey_date = data.get("startDate")
    route = data.get("route") or []
    current_location = data.get("currentLocation") or {}

    if not route:
        return 0

    route_total_dist = float(route[-1].get("distance", 0)) if route else 0.0
    total_dist = float(data.get("train", {}).get("distance", route_total_dist)) if data.get("train") and data.get("train", {}).get("distance") else route_total_dist

    records = []
    captured_at = datetime.now(timezone.utc).isoformat()
    current_seq = current_location.get("sequence")

    for i, station in enumerate(route):
        seq = int(station.get("sequence", i + 1))
        code = str(station.get("stationCode", "")).strip().upper() or None
        name = str(station.get("stationName", "")).strip() or None
        is_current = (current_seq is not None and seq == current_seq)

        dist = float(station.get("distance", 0)) if station.get("distance") is not None else None
        dist_remaining = round(total_dist - dist, 2) if (dist is not None and total_dist >= dist) else None

        dist_from_last = None
        if i > 0 and dist is not None:
            prev_dist = float(route[i-1].get("distance", 0)) if route[i-1].get("distance") is not None else None
            if prev_dist is not None and dist >= prev_dist:
                dist_from_last = round(dist - prev_dist, 2)
        if dist_from_last is None and is_current:
            dist_from_last = current_location.get("distanceFromLastStation")

        sched_arr = station.get("scheduledArrival")
        act_arr = station.get("actualArrival")
        sched_dep = station.get("scheduledDeparture")
        act_dep = station.get("actualDeparture")

        arr_delay = calculate_time_difference_minutes(act_arr, sched_arr) or station.get("delayArrival")
        dep_delay = calculate_time_difference_minutes(act_dep, sched_dep) or station.get("delayDeparture")
        delay_mins = arr_delay if arr_delay is not None else (dep_delay if dep_delay is not None else station.get("delay"))

        next_station = route[i+1] if i+1 < len(route) else None
        prev_station = route[i-1] if i > 0 else None

        record = {
            "train_number": train_number,
            "train_name": train_name,
            "journey_date": journey_date,
            "current_station": name,
            "next_station": next_station.get("stationName") if next_station else None,
            "station_code": code,
            "station_sequence": seq,
            "previous_station": prev_station.get("stationName") if prev_station else None,
            "next_station_code": next_station.get("stationCode") if next_station else None,
            "next_station_sequence": int(next_station.get("sequence")) if next_station and next_station.get("sequence") else None,
            "scheduled_arrival": sched_arr,
            "actual_arrival": act_arr,
            "scheduled_departure": sched_dep,
            "actual_departure": act_dep,
            "delay_minutes": delay_mins,
            "arrival_delay_minutes": arr_delay,
            "departure_delay_minutes": dep_delay,
            "latitude": float(station.get("latitude")) if station.get("latitude") else None,
            "longitude": float(station.get("longitude")) if station.get("longitude") else None,
            "speed_kmph": float(station.get("speedToNextStationKmph")) if station.get("speedToNextStationKmph") else 0,
            "distance_remaining_km": dist_remaining,
            "distance_from_origin_km": dist,
            "distance_from_last_station_km": dist_from_last,
            "running_status": data.get("status"),
            "is_halt": bool(station.get("isHalt", False)),
            "captured_at": captured_at,
            "api_updated_at": data.get("lastUpdatedAt"),
            "is_current_location": is_current
        }
        records.append(record)

    if supabase and records:
        try:
            supabase.table("train_history").insert(records).execute()
            logger.info(f"Inserted {len(records)} records for train {train_number}")
            return len(records)
        except Exception as e:
            logger.error(f"Error inserting records for train {train_number}: {e}")
    return 0

def run_ingestion_cycle(batch_size=5, delay_between_trains=1.5):
    trains = fetch_active_trains()
    logger.info(f"Starting ingestion cycle for {len(trains)} trains...")
    total_records = 0
    for i in range(0, len(trains), batch_size):
        batch = trains[i:i+batch_size]
        logger.info(f"Processing batch: {batch}")
        for train in batch:
            cnt = process_train(train)
            total_records += cnt
            time.sleep(delay_between_trains)
    logger.info(f"Ingestion cycle completed. Total inserted: {total_records}")

if __name__ == "__main__":
    run_ingestion_cycle()
