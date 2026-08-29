class ETAExplanationGenerator:
    """
    Generates human-readable explanations and factor breakdowns for ETA predictions.
    """
    @staticmethod
    def explain_prediction(prediction_item):
        delay = prediction_item.get("current_delay_minutes", 0)
        added_delay = prediction_item.get("predicted_added_delay_minutes", 0)
        speed = prediction_item.get("effective_speed_kmph", 45)
        dist_rem = prediction_item.get("distance_remaining_km", 0)
        station = prediction_item.get("current_station") or prediction_item.get("station_code") or "current location"

        factors = []
        if delay > 30:
            factors.append({
                "factor": "Upstream Congestion",
                "impact": f"+{int(delay)} min accumulated delay",
                "score": min(1.0, delay / 120.0),
                "description": f"Train experienced significant delay ({int(delay)} mins) at earlier stations."
            })
        elif delay > 0:
            factors.append({
                "factor": "Minor Schedule Variance",
                "impact": f"+{int(delay)} min delay",
                "score": delay / 60.0,
                "description": f"Train is running slightly behind schedule by {int(delay)} mins."
            })
        else:
            factors.append({
                "factor": "On-Time Operation",
                "impact": "0 min delay",
                "score": 0.0,
                "description": "Train is currently operating on schedule."
            })

        if speed < 30:
            factors.append({
                "factor": "Stationary / Slow Velocity",
                "impact": f"Speed smoothed to {speed} km/h fallback",
                "score": 0.8,
                "description": "Train is stationary or held at signal; fallback speed applied to prevent division by zero."
            })
        else:
            factors.append({
                "factor": "Cruising Speed",
                "impact": f"Velocity {speed} km/h",
                "score": min(1.0, speed / 110.0),
                "description": f"Train maintaining healthy section speed of {speed} km/h."
            })

        summary = f"At {station}, train has {int(delay)} mins recorded delay. "
        if added_delay > 5:
            summary += f"Model forecasts an additional {added_delay} mins delay over the remaining {dist_rem} km."
        else:
            summary += f"Model expects train to recover time or maintain current delay over remaining {dist_rem} km."

        return {
            "summary": summary,
            "recorded_delay_minutes": delay,
            "predicted_added_delay_minutes": added_delay,
            "effective_speed_kmph": speed,
            "factors": factors
        }
