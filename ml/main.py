import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from ml.eta_predictions import ETAPredictor
from ml.prediction_explanations import ETAExplanationGenerator
import pandas as pd

load_dotenv()

app = FastAPI(title="Dynamic Train ETA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY) if SUPABASE_URL and SUPABASE_ANON_KEY else None
predictor = ETAPredictor()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Dynamic Train ETA Engine"}

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

@app.get("/api/trains/{train_number}/live-eta")
def get_live_eta(train_number: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    res = supabase.table("train_history").select("*").eq("train_number", train_number).order("captured_at", desc=True).limit(100).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail=f"No live telemetry for train {train_number}")

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
            "journey_date": latest.get("journey_date"),
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
