# =======================================================================
# Imports
# =======================================================================
import os, json, asyncio, hashlib, logging, math, time, re, sys
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
import numpy as np
from sentence_transformers import SentenceTransformer, util
import httpx
from concurrent.futures import ThreadPoolExecutor
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from transformers import BertTokenizerFast, EncoderDecoderModel
from gtts import gTTS
from google.cloud import texttospeech
import wikipedia
import tempfile
from wikipedia import exceptions as wiki_exceptions
from sklearn.metrics.pairwise import cosine_similarity
from statistics import mean
import datetime
from pymongo import MongoClient # <-- IMPORTED MONGO

logging.basicConfig(level=logging.INFO)

# =======================================================================
# Load Environment Variable
# =======================================================================
load_dotenv()

# =======================================================================
# Model & Global Vars Initializations
# =======================================================================

# --- LLM and Embedder Config ---
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
embedder = SentenceTransformer(EMBED_MODEL)

# --- OpenRouter Config ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise RuntimeError("Set OPENROUTER_API_KEY in environment")
OPENROUTER_MODEL = "tngtech/deepseek-r1t2-chimera:free" # Using the free model you chose

# --- MongoDB Connection ---
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("Set MONGO_URI in .env file")

try:
    client = MongoClient(MONGO_URI)
    # Assumes your DB is named 'TouristGuideSRP' from your files
    db = client.TouristGuideSRP 
    places_collection = db.places
    print("✅ Connected to MongoDB.")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB: {e}")
    sys.exit(1)


# --- Session & Cache Config ---
SESSION_STORE: Dict[str, Dict[str, Any]] = {}
EMBED_CACHE: Dict[str, List[float]] = {}
MAX_SESSION_MESSAGES = 10
ALLOWED_TOOLS = {"retrieve", "summarize", "translate", "tts", "recommend", "caption", "embed"}

# --- Summarizer & TTS Config ---
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

tokenizer_summarizer = BertTokenizerFast.from_pretrained(
    "mrm8488/bert-small2bert-small-finetuned-cnn_daily_mail-summarization"
)
model_summarizer = EncoderDecoderModel.from_pretrained(
    "mrm8488/bert-small2bert-small-finetuned-cnn_daily_mail-summarization"
).to(device)

_audio_cache = {}


# =======================================================================
# PLACES Database (NOW A CACHE)
# =======================================================================
# This will be filled from MongoDB at startup
PLACES_CACHE = []

# =======================================================================
# Helper Functions
# =======================================================================

def _hash_embed_key(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()

async def run_sync(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        return await loop.run_in_executor(pool, lambda: func(*args, **kwargs))

def session_add_message(conversation_id: str, role: str, text: str):
    s = SESSION_STORE.setdefault(conversation_id, {"messages": [], "embedding": None})
    s["messages"].append({"role": role, "text": text, "ts": time.time()})
    if len(s["messages"]) > MAX_SESSION_MESSAGES:
        s["messages"] = s["messages"][-MAX_SESSION_MESSAGES:]

def session_get_messages(conversation_id: str):
    return SESSION_STORE.get(conversation_id, {}).get("messages", [])

def session_set_embedding(conversation_id: str, emb: List[float]):
    SESSION_STORE.setdefault(conversation_id, {"messages": [], "embedding": None})["embedding"] = emb

def session_get_embedding(conversation_id: str):
    return SESSION_STORE.get(conversation_id, {}).get("embedding")

# --- Stricter grok_generate prompt ---
async def grok_generate(prompt: str, max_tokens: int = 400, temperature: float = 0.0):
    url = "https://openrouter.ai/api/v1/chat/completions"
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON-only API. You MUST respond with ONLY a valid JSON object. Do not add any text, greetings, or explanations before or after the JSON block."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        resp = r.json()
        return resp["choices"][0]["message"]["content"]

async def get_embedding(text: str) -> List[float]:
    key = _hash_embed_key(text) 
    if key in EMBED_CACHE:
        return EMBED_CACHE[key]
    emb = await run_sync(embedder.encode, text, convert_to_numpy=True)
    EMBED_CACHE[key] = emb.tolist()
    return emb.tolist()

def extract_json(text: str) -> Optional[str]:
    start = text.find("{")
    if start == -1: return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{": depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0: return text[start:i+1]
    return None

def verify_plan(plan: Dict[str, Any]) -> (bool, str):
    if "steps" not in plan or not isinstance(plan["steps"], list): return False, "plan missing steps"
    for idx, s in enumerate(plan["steps"]):
        tool = s.get("tool", "").lower()
        if tool not in ALLOWED_TOOLS: return False, f"tool '{tool}' not allowed"
        params = json.dumps(s.get("params", {}))
        if re.search(r"\b(delete|drop|shutdown|rm -rf)\b", params, re.IGNORECASE):
            return False, "unsafe params"
    return True, "ok"

# --- This function is now used again ---
def triple_text(place):
    """Builds simple triple strings for relation embedding"""
    triples = []
    # Use the 'place_id' (which is the MongoDB _id) as the subject
    subject_id = place.get('place_id', 'unknown') 
    
    for rel in place.get("related_places", []):
        triples.append(f"{subject_id} related_to {rel}")
    triples.append(f"{subject_id} is_a {place.get('category','place')}")
    return " . ".join(triples)

# --- MODIFIED index_places FUNCTION (with Relation Embedding) ---
async def index_places():
    """
    Fetch places from MongoDB, transform them, compute embeddings,
    and fill the global PLACES_CACHE.
    """
    print("Fetching places from MongoDB...")
    global PLACES_CACHE
    PLACES_CACHE = [] # Clear cache on startup
    
    mongo_places = list(places_collection.find({}))
    print(f"Found {len(mongo_places)} documents in MongoDB.")

    for doc in mongo_places:
        try:
            place_data = {
                "place_id": str(doc['_id']),
                "name": doc.get('name', 'Unknown Place'),
                "full_text": doc.get('description', ''), # Map description to full_text
                "category": doc.get('type', 'Unknown'),
                "location": doc.get('location'),
                "imageUrl": doc.get('imageUrl'),
                "related_places": doc.get('related_places', []) # <-- Get related_places
            }

            # 1. Compute and add the text embedding
            text_to_embed = f"{place_data['name']}: {place_data['full_text']}"
            emb = await get_embedding(text_to_embed)
            place_data["embedding"] = emb
            
            # 2. Compute and add the relation embedding
            rel_text = triple_text(place_data)
            place_data["relation_embedding"] = await get_embedding(rel_text)
            
            PLACES_CACHE.append(place_data)

        except Exception as e:
            print(f"Warning: Failed to process document {doc.get('_id')}: {e}")

    print(f"Indexed {len(PLACES_CACHE)} places from MongoDB (with relation embeddings).")
    if PLACES_CACHE:
        print("Sample:", PLACES_CACHE[0]['name'])
# --- END OF MODIFICATION ---

def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

# --- MODIFIED retrieve_local FUNCTION (with Relation Embedding) ---
async def retrieve_local(query: str, k: int = 3, allow_wiki_fallback: bool = True):
    """
    Hybrid local retrieval (using both embeddings).
    Returns list of source objects that include imageUrl when available.
    """
    global PLACES_CACHE
    if not PLACES_CACHE:
        print("Warning: PLACES_CACHE is empty. Seeding again...")
        await index_places()
        if not PLACES_CACHE:
            print("Error: PLACES_CACHE is still empty after re-seeding.")
            return []

    # compute query embedding
    query_emb = np.array(await get_embedding(query), dtype=float)

    scored = []
    best_score = 0.0

    for place in PLACES_CACHE:
        place_emb = np.array(place.get("embedding", np.zeros_like(query_emb)))
        score_main = cosine_sim(query_emb, place_emb)

        rel_emb = place.get("relation_embedding")
        score_rel = 0.0
        if rel_emb is not None:
            score_rel = cosine_sim(query_emb, np.array(rel_emb))

        combined_score = 0.7 * score_main + 0.3 * score_rel
        scored.append((combined_score, place))
        best_score = max(best_score, combined_score)

    # sort top-k
    scored.sort(key=lambda x: x[0], reverse=True)
    top_local = []
    for sc, place in scored[:k]:
        top_local.append({
            "id": place["place_id"],
            "name": place["name"],
            "full_text": place["full_text"],
            "category": place.get("category"),
            "location": place.get("location"),
            "imageUrl": place.get("imageUrl"),   # local DB imageUrl (may be None)
            "score": float(sc),
            "source": "localDB"
        })

    # Wikipedia fallback: add 1 wiki result with imageUrl when needed
    if allow_wiki_fallback and (best_score < 0.65 or len(top_local) < k):
        try:
            search_results = await run_sync(wikipedia.search, query)
            if search_results:
                best_title = search_results[0]
                try:
                    page = await run_sync(wikipedia.page, best_title, auto_suggest=False)
                except wiki_exceptions.DisambiguationError:
                    # try second result if disambiguation
                    if len(search_results) > 1:
                        best_title = search_results[1]
                        page = await run_sync(wikipedia.page, best_title, auto_suggest=False)
                    else:
                        page = None

                if page:
                    wiki_text = page.summary or (page.content[:2000] if hasattr(page, "content") else "")
                    # try to pick a good image from page.images
                    wiki_image = None
                    images = []
                    try:
                        images = getattr(page, "images", []) or []
                        for img_url in images:
                            lower = img_url.lower()
                            if lower.endswith((".jpg", ".jpeg", ".png")) and all(x not in lower for x in ("logo", "icon", "badge")):
                                wiki_image = img_url
                                break
                        if not wiki_image and images:
                            wiki_image = images[0]
                    except Exception:
                        wiki_image = None

                    top_local.append({
                        "id": f"wiki::{page.title}",
                        "name": page.title,
                        "full_text": wiki_text[:1200],
                        "category": "Wikipedia",
                        "score": 0.5,
                        "source": "wikipedia",
                        "imageUrl": wiki_image,   # <-- add wiki image here (may be None)
                        "images": images
                    })
                    print(f"✅ Wikipedia fallback added: {page.title} (image: {bool(wiki_image)})")
            else:
                print(f"⚠️ No Wikipedia results found for '{query}'.")
        except wiki_exceptions.PageError:
            print(f"⚠️ Wikipedia PageError: No page found for '{query}'.")
        except Exception as e:
            print(f"Wikipedia error: {e}")

    return top_local


# --- END OF MODIFICATION ---

def _hash_text(text, voice="default", style="neutral"):
    combined = f"{text}|{voice}|{style}"
    return hashlib.md5(combined.encode("utf-8")).hexdigest()

async def summarize_local(text: str, style: str = "summary", lang: str = "en") -> dict:
    # (This function is unchanged)
    length_map = { "map_pin": (15, 30), "summary": (40, 80), "deep": (80, 200), }
    min_len, max_len = length_map.get(style, (40, 80))
    inputs = tokenizer_summarizer(
        [text], padding="max_length", truncation=True, max_length=512, return_tensors="pt"
    )
    input_ids = inputs.input_ids.to(device)
    attention_mask = inputs.attention_mask.to(device)
    loop = asyncio.get_event_loop()
    output_ids = await loop.run_in_executor(
        None,
        lambda: model_summarizer.generate(
            input_ids, attention_mask=attention_mask, max_length=max_len, min_length=min_len
        )
    )
    summary_text = tokenizer_summarizer.decode(output_ids[0], skip_special_tokens=True)
    confidence = 0.95
    warnings = []
    if any(keyword in text.lower() for keyword in ["year", "built", "founded"]):
        if not any(keyword in summary_text.lower() for keyword in ["year", "built", "founded"]):
            confidence = 0.7
            warnings.append("Key facts may be missing (e.g., year/date).")
    return {
        "summary": summary_text.strip(), "style": style, "lang": lang,
        "length_label": f"{min_len}-{max_len} tokens", "confidence": confidence, "warnings": warnings
    }

async def tts_local(text: str, voice="default", style="neutral", fmt="mp3", bucket=None) -> dict:
    # (This function is unchanged, already has Windows fix)
    text_hash = _hash_text(text, voice, style)
    filename = f"{text_hash[:12]}.{fmt}"
    temp_dir = tempfile.gettempdir() 
    filepath = os.path.join(temp_dir, filename)
    url = f"/static/{filename}"
    if text_hash in _audio_cache:
        if os.path.exists(_audio_cache[text_hash]["audio_file"]):
            return _audio_cache[text_hash]
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, lambda: gTTS(text=text, lang="en").save(filepath)
    )
    result = {"audio_file": filepath, "audio_url": url, "voice": voice, "style": style}
    _audio_cache[text_hash] = {**result, "expiry": datetime.datetime.utcnow() + datetime.timedelta(hours=6)}
    return result

# =======================================================================
# Agent Logic Functions (Unchanged, prompts are already fixed)
# =======================================================================

async def get_json_plan_from_llm(user_text, user_profile_summary, conversation):
    try:
        prompt = f"""
        You must create a JSON plan with a "steps" key to answer the user's question.
        Available tools: {json.dumps(list(ALLOWED_TOOLS))}
        
        1.  If the question is a simple greeting (like "hi", "hello"), return:
            {{"steps": []}}
        
        2.  If the question is about tourist info (like "tell me about Marina Beach"), you MUST use the "retrieve" and "summarize" tools.
            Example: {{"steps": [
                {{"tool": "retrieve", "input": "information about Marina Beach", "params": {{"k": 3}}}},
                {{"tool": "summarize", "input": "retrieved context"}}
            ]}}
        
        User Question: "{user_text}"
        Conversation History: {conversation}
        
        Your JSON response:
        """
        out_text = await grok_generate(prompt, max_tokens=400)
        plan_str = extract_json(out_text)
        
        if not plan_str:
             print(f"⚠️ No JSON found in LLM output. Assuming chit-chat.")
             return {"steps": []}
        
        plan = json.loads(plan_str)
        if "steps" not in plan or not isinstance(plan["steps"], list):
            print("⚠️ LLM returned invalid plan, using fallback plan.")
            raise ValueError("Invalid plan structure")
        if not plan["steps"]:
            return plan
        ok, msg = verify_plan(plan)
        if not ok:
            print(f"⚠️ Plan verification warning: {msg}. Using fallback.")
            raise ValueError(f"Plan verification failed: {msg}")
        return plan
    except Exception as e:
        print(f"⚠️ Planning failed: {e}. Using fallback plan.")
        return {
            "steps": [
                {"tool": "retrieve", "input": user_text, "params": {"k": 3}},
                {"tool": "summarize", "input": "retrieved context"}
            ]
        }

async def execute_step(step: Dict[str, Any], session_ctx: Dict[str, Any]):
    # (This function is unchanged)
    tool = step.get("tool", "").lower()
    inp = step.get("input")
    params = step.get("params", {})
    result = None
    if tool == "retrieve":
        retrieve_kwargs = { "k": params.get("k", 3), "allow_wiki_fallback": True }
        result = await retrieve_local(inp, **retrieve_kwargs)
        return result
    elif tool == "summarize":
        result = await summarize_local(inp)
    elif tool == "tts":
        result = await tts_local(inp, voice=params.get("voice", "female_en_in"), fmt=params.get("format", "mp3"))
    elif tool == "embed":
        emb = await get_embedding(inp)
        return {"embedding": emb}
    else:
        result = {"error": f"tool {tool} not implemented"}
    return result

async def compose_final_answer(exec_results: List[Dict[str, Any]], user_text: str, user_profile_summary: str):
    # (This function is unchanged)
    sources = []
    for item in exec_results:
        step, res = item["step"], item["result"]
        if step["tool"].lower() == "retrieve" and isinstance(res, list):
            sources.extend(res)
        elif step["tool"].lower() == "summarize" and isinstance(res, dict) and "summary" in res:
            pass
    sources_sorted = sorted(sources, key=lambda x: x.get("score", 0), reverse=True)[:5]
    avg_score = mean([s.get("score", 0) for s in sources_sorted]) if sources_sorted else 0.0
    sources_text = "\n".join([
        f"PLACE {i+1}: {s.get('name')} ({s.get('score', 0):.3f}) – {s.get('full_text', s.get('excerpt', '...'))}"
        for i, s in enumerate(sources_sorted)
    ]) or "No sources."
    
    prompt = f"""
    You are a JSON-only API. You must answer the user's question based *only* on the provided SOURCES.
    If SOURCES is "No sources.", just have a friendly conversation (e.g., if user said "hello", say "hello" back).
    
    User Question: {user_text}
    SOURCES:
    {sources_text}
    
    Your JSON response: {{"answer": "...", "sources": ["..."], "confidence": 0.0}}
    """
    
    out_text = await grok_generate(prompt, max_tokens=300)
    j = extract_json(out_text) or out_text
    try:
        out = json.loads(j)
    except:
        fallback_answer = "Your response is ready..."
        if not sources_text or sources_text == "No sources.":
            fallback_answer = "Hello! How can I help you today?"
        out = {"answer": fallback_answer, "sources": sources_sorted, "confidence": 0.1}
    if "confidence" not in out:
        out["confidence"] = avg_score
    if "sources" not in out:
        out["sources"] = sources_sorted
    return out

async def orchestrate(text: str,
                      user_id: Optional[str] = None,
                      location: Optional[Dict[str, float]] = None,
                      conversation_id: Optional[str] = None):
    # (This function is unchanged)
    conv = conversation_id or f"user:{user_id or 'anon'}"
    session_add_message(conv, "user", text)
    user_profile_summary = "{}"
    messages_ctx = session_get_messages(conv)
    plan = await get_json_plan_from_llm(text, user_profile_summary, messages_ctx)
    exec_results = []
    context_for_summary = []
    if plan.get("steps"):
        print(f"Executing plan with {len(plan['steps'])} steps.")
        for step in plan.get("steps", []):
            inp = step.get("input")
            if step.get("tool") == "summarize" and inp == "retrieved context":
                inp = json.dumps(context_for_summary) 
                step["input"] = inp 
            res = await execute_step(step, session_ctx={"user_id": user_id})
            if step.get("tool") == "retrieve" and isinstance(res, list):
                context_for_summary.extend(res)
            exec_results.append({"step": step, "result": res})
    else:
        print("Plan is empty, handling as chit-chat.")
    final = await compose_final_answer(exec_results, text, user_profile_summary)
    session_add_message(conv, "assistant", final.get("answer", ""))
    audio_url = None
    for it in exec_results:
        if it["step"]["tool"].lower() == "tts":
            audio_url = it["result"].get("audio_file") 
    if audio_url is None and final.get("answer"):
        try:
            tts_res = await tts_local(final["answer"])
            audio_url = tts_res.get("audio_file")
        except Exception as e:
            print(f"Auto-TTS failed: {e}")
    return {
        "answer": final["answer"], "sources": final["sources"], "confidence": final["confidence"],
        "audio_url": audio_url, "plan": plan, "execution": exec_results
    }


# =======================================================================
# FastAPI Server Wrapper
# =======================================================================

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    userId: str = "default-user"
    conversationId: str = "default-convo"


@app.on_event("startup")
async def startup_event():
    print("🌍 Seeding local places database...")
    await index_places() # This will now connect to MongoDB
    print("✅ Database seeded.")


@app.post("/api/chat")
async def handle_chat_message(request: ChatRequest):
    try:
        response_data = await orchestrate(
            text=request.message,
            user_id=request.userId,
            location=None, 
            conversation_id=request.conversationId
        )
        return response_data
        
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return {
            "answer": "Sorry, an error occurred on my end.",
            "sources": [],
            "confidence": 0.0,
            "audio_url": None,
            "plan": None,
            "execution": None
        }

if __name__ == "__main__":
    print("Starting Python AI Bot server on http://localhost:5001")
    uvicorn.run(app, host="0.0.0.0", port=5001)