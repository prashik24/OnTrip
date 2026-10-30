from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import os

from recommender import recommender

app = FastAPI(
    title="OnTrip ML Recommendation Engine",
    description="Hybrid content-based and collaborative recommendation microservice for destinations.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecommendationRequest(BaseModel):
    user_id: Optional[str] = None
    liked_places: Optional[List[str]] = Field(default_factory=list)
    bookmarked_places: Optional[List[str]] = Field(default_factory=list)
    preferred_tags: Optional[List[str]] = Field(default_factory=list)
    top_k: Optional[int] = 6

@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "OnTrip ML Recommendation Microservice",
        "total_destinations": len(recommender.places),
        "vector_dimensions": recommender.tfidf_matrix.shape[1] if recommender.tfidf_matrix is not None else 0
    }

@app.post("/api/recommend")
def get_recommendations(payload: RecommendationRequest):
    try:
        results = recommender.recommend(
            liked_place_ids=payload.liked_places,
            bookmarked_place_ids=payload.bookmarked_places,
            preferred_tags=payload.preferred_tags,
            top_k=payload.top_k or 6
        )
        return {
            "success": True,
            "count": len(results),
            "recommendations": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/similar/{place_id}")
def get_similar_places(place_id: str, top_k: int = 4):
    if place_id not in recommender.place_map:
        raise HTTPException(status_code=404, detail=f"Place '{place_id}' not found.")

    idx = recommender.place_map[place_id]
    scores = recommender.pairwise_sim[idx]
    ranked_indices = [i for i in scores.argsort()[::-1] if i != idx][:top_k]

    results = []
    for r_idx in ranked_indices:
        p = recommender.places[r_idx]
        match_percentage = int(min(98, max(65, scores[r_idx] * 100)))
        results.append({
            "id": p["id"],
            "name": p["name"],
            "state": p.get("state"),
            "region": p.get("region"),
            "tag": p.get("tag"),
            "image": p.get("image"),
            "short": p.get("short"),
            "matchScore": match_percentage,
            "reason": f"Similar experience to {recommender.places[idx]['name']}"
        })

    return {
        "success": True,
        "source": recommender.places[idx]["name"],
        "similar": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
