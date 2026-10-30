import json
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class HybridRecommender:
    def __init__(self, data_path=None):
        if data_path is None:
            data_path = os.path.join(os.path.dirname(__file__), "data", "placesData.json")
        self.data_path = data_path
        self.places = []
        self.place_map = {}
        self.state_map = {}
        self.tfidf = None
        self.tfidf_matrix = None
        self.pairwise_sim = None
        self._load_and_train()

    def _load_and_train(self):
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Places data file not found at {self.data_path}")

        with open(self.data_path, "r", encoding="utf-8") as f:
            self.places = json.load(f)

        self.place_map = {p["id"].lower(): idx for idx, p in enumerate(self.places)}
        
        # Build state map to resolve both place IDs and state IDs (e.g., 'goa', 'kerala')
        self.state_map = {}
        for idx, p in enumerate(self.places):
            sid = p.get("stateId", "").lower()
            if sid:
                self.state_map.setdefault(sid, []).append(idx)
            sname = p.get("state", "").lower()
            if sname:
                self.state_map.setdefault(sname, []).append(idx)

        # Build composite feature documents for Content-Based Filtering
        corpus = []
        for p in self.places:
            attractions = " ".join(p.get("topAttractions", []))
            foods = " ".join(p.get("food", []))
            doc = (
                f"{p.get('name', '')} {p.get('state', '')} {p.get('region', '')} "
                f"{p.get('tag', '')} {p.get('short', '')} {p.get('whyFamous', '')} "
                f"{attractions} {foods}"
            )
            corpus.append(doc)

        # Train TF-IDF vectorizer (unigrams + bigrams)
        self.tfidf = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        self.tfidf_matrix = self.tfidf.fit_transform(corpus)

        # Precompute pairwise cosine similarity matrix
        self.pairwise_sim = cosine_similarity(self.tfidf_matrix, self.tfidf_matrix)

    def _resolve_indices(self, item_id):
        key = item_id.lower().strip()
        if key in self.place_map:
            return [self.place_map[key]]
        if key in self.state_map:
            return self.state_map[key]
        # Partial match fallback
        matches = [idx for pid, idx in self.place_map.items() if key in pid]
        return matches

    def recommend(self, liked_place_ids=None, bookmarked_place_ids=None, preferred_tags=None, top_k=6):
        liked_place_ids = liked_place_ids or []
        bookmarked_place_ids = bookmarked_place_ids or []
        preferred_tags = preferred_tags or []

        all_interacted_raw = set(liked_place_ids + bookmarked_place_ids)

        # Resolve all interacted place indices
        all_interacted_indices = set()
        for item in all_interacted_raw:
            all_interacted_indices.update(self._resolve_indices(item))

        # Check for Cold-Start (user has no interaction signals)
        if not all_interacted_indices and not preferred_tags:
            return self._cold_start_recommendations(top_k=top_k)

        # Build composite user preference vector in TF-IDF feature space
        user_vector = np.zeros(self.tfidf_matrix.shape[1])
        has_signal = False

        # 1. Incorporate Bookmarks (weight 1.5)
        for item in bookmarked_place_ids:
            indices = self._resolve_indices(item)
            for idx in indices:
                user_vector += 1.5 * self.tfidf_matrix[idx].toarray().flatten()
                has_signal = True

        # 2. Incorporate Likes (weight 1.0)
        for item in liked_place_ids:
            indices = self._resolve_indices(item)
            for idx in indices:
                user_vector += 1.0 * self.tfidf_matrix[idx].toarray().flatten()
                has_signal = True

        # 3. Incorporate explicit preferred tags if provided
        if preferred_tags:
            tag_text = " ".join(preferred_tags)
            tag_vec = self.tfidf.transform([tag_text]).toarray().flatten()
            user_vector += 1.2 * tag_vec
            has_signal = True

        if not has_signal:
            return self._cold_start_recommendations(top_k=top_k)

        # Normalize user vector
        norm = np.linalg.norm(user_vector)
        if norm > 0:
            user_vector = user_vector / norm

        # Compute cosine similarity between user vector and all destination candidates
        sim_scores = cosine_similarity(user_vector.reshape(1, -1), self.tfidf_matrix).flatten()

        # Rank places by score
        ranked_indices = np.argsort(sim_scores)[::-1]

        results = []
        for idx in ranked_indices:
            place = self.places[idx]

            # Filter out places the user already directly interacted with if we have enough candidates
            if idx in all_interacted_indices and len(self.places) - len(all_interacted_indices) >= top_k:
                continue

            raw_score = float(sim_scores[idx])
            # Scale raw cosine similarity (typically 0.15 - 0.70) to human-intuitive match percentage (72% - 98%)
            scaled_score = 70 + int((raw_score / 0.60) * 28)
            match_percentage = int(np.clip(scaled_score, 72, 98))

            # Determine best explanation
            best_ref = None
            best_ref_sim = -1
            for ref_idx in all_interacted_indices:
                pair_sim = self.pairwise_sim[ref_idx][idx]
                if pair_sim > best_ref_sim:
                    best_ref_sim = pair_sim
                    best_ref = self.places[ref_idx]["name"]

            if best_ref:
                reason = f"Recommended based on your interest in {best_ref}"
            elif preferred_tags:
                reason = f"Matches your passion for {', '.join(preferred_tags[:2])}"
            else:
                reason = f"Trending highlight in {place.get('region', 'India')}"

            results.append({
                "id": place["id"],
                "name": place["name"],
                "state": place.get("state"),
                "stateId": place.get("stateId"),
                "region": place.get("region"),
                "tag": place.get("tag"),
                "bestTime": place.get("bestTime"),
                "short": place.get("short"),
                "whyFamous": place.get("whyFamous"),
                "image": place.get("image"),
                "topAttractions": place.get("topAttractions", []),
                "idealDuration": place.get("idealDuration", "2 to 3 days"),
                "matchScore": match_percentage,
                "reason": reason
            })

            if len(results) >= top_k:
                break

        return results

    def _cold_start_recommendations(self, top_k=6):
        curated_seeds = ["jaipur", "north-goa", "udaipur", "manali", "varanasi", "munnar", "leh", "ooty"]
        results = []
        seen = set()

        for cid in curated_seeds:
            indices = self._resolve_indices(cid)
            if indices:
                idx = indices[0]
                place = self.places[idx]
                if place["id"] not in seen:
                    seen.add(place["id"])
                    results.append({
                        "id": place["id"],
                        "name": place["name"],
                        "state": place.get("state"),
                        "stateId": place.get("stateId"),
                        "region": place.get("region"),
                        "tag": place.get("tag"),
                        "bestTime": place.get("bestTime"),
                        "short": place.get("short"),
                        "whyFamous": place.get("whyFamous"),
                        "image": place.get("image"),
                        "topAttractions": place.get("topAttractions", []),
                        "idealDuration": place.get("idealDuration", "2 to 3 days"),
                        "matchScore": 94,
                        "reason": "Top trending destination for travelers"
                    })
                    if len(results) >= top_k:
                        break

        # Fill with more if needed
        if len(results) < top_k:
            for place in self.places:
                if place["id"] not in seen:
                    results.append({
                        "id": place["id"],
                        "name": place["name"],
                        "state": place.get("state"),
                        "stateId": place.get("stateId"),
                        "region": place.get("region"),
                        "tag": place.get("tag"),
                        "bestTime": place.get("bestTime"),
                        "short": place.get("short"),
                        "whyFamous": place.get("whyFamous"),
                        "image": place.get("image"),
                        "topAttractions": place.get("topAttractions", []),
                        "idealDuration": place.get("idealDuration", "2 to 3 days"),
                        "matchScore": 89,
                        "reason": "Featured traveler favorite"
                    })
                    seen.add(place["id"])
                    if len(results) >= top_k:
                        break

        return results

recommender = HybridRecommender()
