import os
from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client
from ml.eta_predictions import ETAPredictor
from ml.prediction_explanations import ETAExplanationGenerator
from ml.inference.predict_single import predict_single
import pandas as pd

load_dotenv()

app = FastAPI(title="Dynamic Train ETA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000"
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY) if SUPABASE_URL and SUPABASE_ANON_KEY else None
predictor = ETAPredictor()

@app.get("/health")
@app.get("/api/health")
def health_check():
    db_status = "connected" if supabase else "disconnected"
    return {
        "status": "ok",
        "service": "Dynamic Train ETA Python ML Engine",
        "database": db_status
    }

@app.post("/api/predict-single")
def predict_single_endpoint(payload: Dict[str, Any] = Body(...)):
    res = predict_single(payload)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

@app.get("/api/trains/search")
def search_trains(q: str = Query("", description="Query string for train number or name")):
    if not q or not q.strip():
        return {"data": []}
    query_str = q.strip()
    if not supabase:
        return {"data": []}

    res = supabase.table("trains").select("*").or_(f"train_number.ilike.%{query_str}%,train_name.ilike.%{query_str}%").limit(20).execute()
    if res.data:
        return {"data": res.data}

    # Fallback to train_history
    res_hist = supabase.table("train_history").select("train_number, train_name").or_(f"train_number.ilike.%{query_str}%,train_name.ilike.%{query_str}%").limit(50).execute()
    unique = {}
    for r in (res_hist.data or []):
        tn = r.get("train_number")
        if tn and tn not in unique:
            unique[tn] = {"train_number": tn, "train_name": r.get("train_name") or f"Train {tn}"}
    return {"data": list(unique.values())}

@app.get("/api/trains/available")
def get_available_trains():
    if not supabase:
        return {"data": []}
    res = supabase.table("trains").select("*").order("train_number").execute()
    if res.data:
        return {"data": res.data}

    res_hist = supabase.table("train_history").select("train_number, train_name").limit(500).execute()
    unique = {}
    for r in (res_hist.data or []):
        tn = r.get("train_number")
        if tn and tn not in unique:
            unique[tn] = {"train_number": tn, "train_name": r.get("train_name") or f"Train {tn}"}
    return {"data": list(unique.values())}

@app.get("/api/trains/{train_number}/history")
def get_train_history(train_number: str, page: int = 1, limit: int = 50):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    offset = (page - 1) * limit
    res = supabase.table("train_history").select("*", count="exact").eq("train_number", train_number).order("captured_at", desc=True).range(offset, offset + limit - 1).execute()
    
    return {
        "data": res.data or [],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": res.count or 0,
            "totalPages": ((res.count or 0) + limit - 1) // limit if limit > 0 else 1
        }
    }

from datetime import datetime

@app.get("/api/trains/{train_number}/live-eta")
def get_live_eta(train_number: str, journey_date: Optional[str] = Query(None, description="Journey date in YYYY-MM-DD format")):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    today_str = datetime.now().strftime("%Y-%m-%d")
    selected_date = journey_date or today_str

    # 1. FUTURE JOURNEY DATE: journey_date > currentDate
    if selected_date > today_str:
        # Retrieve route template from train catalog or history
        res_route = supabase.table("train_history").select("*").eq("train_number", train_number).order("sequence", desc=False).limit(150).execute()
        
        records = res_route.data or []
        if not records:
            # Fallback to general trains catalog
            res_train = supabase.table("trains").select("*").eq("train_number", train_number).limit(1).execute()
            if not res_train.data:
                raise HTTPException(status_code=404, detail=f"No route found for scheduled train {train_number}")
            t_info = res_train.data[0]
            records = [{
                "train_number": train_number,
                "train_name": t_info.get("train_name"),
                "station_code": t_info.get("source_station"),
                "station_name": t_info.get("source_station"),
                "sequence": 1,
                "distance": 0,
                "scheduled_departure": "06:00",
                "is_halt": True
            }]

        origin_station = records[0] if records else {}
        terminus_station = records[-1] if records else {}
        origin_name = origin_station.get("station_name") or origin_station.get("station_code") or "Origin"
        origin_dep_time = origin_station.get("scheduled_departure") or origin_station.get("scheduled_arrival") or "06:00"
        total_dist = float(terminus_station.get("distance_from_origin_km") or terminus_station.get("distance") or 0)
        
        # Project future timetable stations
        future_stations = []
        for idx, st in enumerate(records):
            future_stations.append({
                **st,
                "journey_date": selected_date,
                "status": "upcoming",
                "is_current_location": idx == 0,
                "actual_arrival": None,
                "actual_departure": None,
                "delay_minutes": 0,
                "speed_kmph": 0
            })

        return {
            "data": {
                "train_number": train_number,
                "train_name": origin_station.get("train_name") or f"Train {train_number}",
                "journey_date": selected_date,
                "running_status": "YET_TO_START",
                "status": "SCHEDULED",
                "progress_percent": 0,
                "current": {
                    "station_code": origin_station.get("station_code"),
                    "station_name": origin_name,
                    "sequence": 1,
                    "is_current_location": True,
                    "latitude": origin_station.get("latitude"),
                    "longitude": origin_station.get("longitude"),
                    "speed_kmph": 0,
                    "delay_minutes": 0,
                    "distance_from_origin_km": 0,
                    "running_status": "YET_TO_START"
                },
                "current_station": origin_station,
                "current_speed": 0,
                "distance_traveled_km": 0,
                "remaining_distance_km": total_dist,
                "remaining_stations_count": len(records),
                "status_message": f"Scheduled to depart from {origin_name} on {origin_dep_time}",
                "predictions": [],
                "explanation": {
                    "root_cause": "Scheduled Journey",
                    "explanation": f"Train is scheduled for a future run on {selected_date}. Timetable schedule active.",
                    "severity": "nominal"
                },
                "stations": future_stations
            }
        }

    # 2. TODAY OR HISTORICAL JOURNEY
    query = supabase.table("train_history").select("*").eq("train_number", train_number)
    if journey_date:
        query = query.eq("journey_date", journey_date)

    res = query.order("captured_at", desc=True).limit(100).execute()
    if not res.data:
        # Fallback without journey_date filter if specific date is missing in history
        res = supabase.table("train_history").select("*").eq("train_number", train_number).order("captured_at", desc=True).limit(100).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail=f"No telemetry found for train {train_number} on {selected_date}")

    records = res.data
    df = pd.DataFrame(records)
    predictions = predictor.predict_live_eta(df)

    sample_pred = predictions[0] if predictions else {}
    explanation = ETAExplanationGenerator.explain_prediction(sample_pred)

    latest = records[0]
    current = next((r for r in records if r.get("is_current_location")), latest)

    return {
        "data": {
            "train_number": train_number,
            "train_name": latest.get("train_name"),
            "journey_date": latest.get("journey_date") or selected_date,
            "running_status": latest.get("running_status") or "running",
            "current": current,
            "predictions": predictions,
            "explanation": explanation,
            "stations": records
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

