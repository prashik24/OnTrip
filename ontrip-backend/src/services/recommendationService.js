import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load places dataset
const placesPath = path.join(__dirname, "../data/placesData.json");
let placesData = [];

try {
  if (fs.existsSync(placesPath)) {
    placesData = JSON.parse(fs.readFileSync(placesPath, "utf-8"));
  }
} catch (err) {
  console.error("Failed to load placesData.json in recommendationService:", err.message);
}

// Simple English stopwords for JS TF-IDF
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "could", "did", "do",
  "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have", "having",
  "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it",
  "its", "itself", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
  "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some",
  "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this",
  "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when", "where",
  "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Precompute vocabulary and document frequencies for placesData
let vocab = new Map();
let docVectors = [];
let idf = new Map();

function buildEngine() {
  if (!placesData || placesData.length === 0) return;

  const N = placesData.length;
  const docTokensList = placesData.map((p) => {
    const raw = `${p.name} ${p.state} ${p.region} ${p.tag} ${p.short} ${p.whyFamous} ${(p.topAttractions || []).join(" ")} ${(p.food || []).join(" ")}`;
    return tokenize(raw);
  });

  // Calculate Document Frequency (DF)
  const df = new Map();
  docTokensList.forEach((tokens) => {
    const uniqueTokens = new Set(tokens);
    uniqueTokens.forEach((token) => {
      df.set(token, (df.get(token) || 0) + 1);
    });
  });

  // Calculate IDF
  let vIndex = 0;
  df.forEach((count, token) => {
    vocab.set(token, vIndex++);
    idf.set(token, Math.log((N + 1) / (count + 1)) + 1);
  });

  // Build TF-IDF vectors for all places
  docVectors = docTokensList.map((tokens) => {
    const tf = new Map();
    tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));

    const vec = new Float32Array(vocab.size);
    let normSq = 0;
    tf.forEach((count, t) => {
      const idx = vocab.get(t);
      if (idx !== undefined) {
        const val = (count / tokens.length) * idf.get(t);
        vec[idx] = val;
        normSq += val * val;
      }
    });

    const norm = Math.sqrt(normSq);
    if (norm > 0) {
      for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    }
    return vec;
  });
}

buildEngine();

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}

function resolvePlaceIndices(itemId) {
  const key = String(itemId).toLowerCase().trim();
  const results = [];
  placesData.forEach((p, idx) => {
    if (p.id.toLowerCase() === key) results.push(idx);
    else if (p.stateId && p.stateId.toLowerCase() === key) results.push(idx);
    else if (p.state && p.state.toLowerCase() === key) results.push(idx);
    else if (p.id.toLowerCase().includes(key)) results.push(idx);
  });
  return results;
}

/**
 * Native Node.js Fallback Engine (Used on Render or if Python microservice is offline)
 */
function runNativeJsRecommendation({ likedPlaces = [], bookmarkedPlaces = [], preferredTags = [], topK = 6 }) {
  if (!placesData || placesData.length === 0) return [];

  const allInteractedIndices = new Set();
  [...likedPlaces, ...bookmarkedPlaces].forEach((id) => {
    resolvePlaceIndices(id).forEach((idx) => allInteractedIndices.add(idx));
  });

  // Cold Start check
  if (allInteractedIndices.size === 0 && (!preferredTags || preferredTags.length === 0)) {
    const curated = ["jaipur", "north-goa", "udaipur", "manali", "varanasi", "munnar"];
    const out = [];
    curated.forEach((cid) => {
      const idxs = resolvePlaceIndices(cid);
      if (idxs.length > 0 && out.length < topK) {
        const p = placesData[idxs[0]];
        out.push({
          ...p,
          matchScore: 94,
          reason: "Top trending destination for travelers"
        });
      }
    });
    return out;
  }

  // Build user vector
  const userVec = new Float32Array(vocab.size);
  let hasSignal = false;

  bookmarkedPlaces.forEach((id) => {
    resolvePlaceIndices(id).forEach((idx) => {
      const v = docVectors[idx];
      for (let i = 0; i < userVec.length; i++) userVec[i] += 1.5 * v[i];
      hasSignal = true;
    });
  });

  likedPlaces.forEach((id) => {
    resolvePlaceIndices(id).forEach((idx) => {
      const v = docVectors[idx];
      for (let i = 0; i < userVec.length; i++) userVec[i] += 1.0 * v[i];
      hasSignal = true;
    });
  });

  if (preferredTags && preferredTags.length > 0) {
    const tagTokens = tokenize(preferredTags.join(" "));
    tagTokens.forEach((t) => {
      const idx = vocab.get(t);
      if (idx !== undefined) {
        userVec[idx] += 1.2 * idf.get(t);
        hasSignal = true;
      }
    });
  }

  if (!hasSignal) {
    return placesData.slice(0, topK).map((p) => ({
      ...p,
      matchScore: 88,
      reason: "Popular destination highlight"
    }));
  }

  // Normalize user vector
  let normSq = 0;
  for (let i = 0; i < userVec.length; i++) normSq += userVec[i] * userVec[i];
  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (let i = 0; i < userVec.length; i++) userVec[i] /= norm;
  }

  // Rank places
  const scored = placesData.map((place, idx) => {
    const sim = cosineSimilarity(userVec, docVectors[idx]);
    return { place, idx, sim };
  });

  scored.sort((a, b) => b.sim - a.sim);

  const results = [];
  for (const item of scored) {
    if (allInteractedIndices.has(item.idx) && placesData.length - allInteractedIndices.size >= topK) {
      continue;
    }

    const scaledScore = Math.min(98, Math.max(72, 70 + Math.floor((item.sim / 0.6) * 28)));

    let reason = "Recommended based on your recent travel interests";
    if (allInteractedIndices.size > 0) {
      let bestRef = null;
      let maxSim = -1;
      allInteractedIndices.forEach((refIdx) => {
        const pairSim = cosineSimilarity(docVectors[refIdx], docVectors[item.idx]);
        if (pairSim > maxSim) {
          maxSim = pairSim;
          bestRef = placesData[refIdx].name;
        }
      });
      if (bestRef) reason = `Recommended based on your interest in ${bestRef}`;
    }

    results.push({
      ...item.place,
      matchScore: scaledScore,
      reason
    });

    if (results.length >= topK) break;
  }

  return results;
}

/**
 * Main Hybrid Recommendation Dispatcher
 * Calls Python FastAPI service if available; automatically falls back to native JS engine
 */
export async function getRecommendations({ userId = null, likedPlaces = [], bookmarkedPlaces = [], preferredTags = [], topK = 6 }) {
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/api/recommend`,
      {
        user_id: userId,
        liked_places: likedPlaces,
        bookmarked_places: bookmarkedPlaces,
        preferred_tags: preferredTags,
        top_k: topK
      },
      { timeout: 1500 }
    );

    if (response.data && response.data.recommendations) {
      return {
        source: "python-ml-fastapi",
        count: response.data.recommendations.length,
        recommendations: response.data.recommendations
      };
    }
  } catch (err) {
    // Python service is offline (standard on Render free tier or when local ML server is stopped)
    // Fall back to native JS vector engine seamlessly
  }

  const jsRecs = runNativeJsRecommendation({
    likedPlaces,
    bookmarkedPlaces,
    preferredTags,
    topK
  });

  return {
    source: "native-hybrid-engine",
    count: jsRecs.length,
    recommendations: jsRecs
  };
}

export default { getRecommendations };
