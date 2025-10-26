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
import tempfile # <-- Fix for Windows
from wikipedia import exceptions as wiki_exceptions
from sklearn.metrics.pairwise import cosine_similarity
from statistics import mean
import datetime

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
OPENROUTER_MODEL = "tngtech/deepseek-r1t2-chimera:free" # Using the free model

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
# PLACES Database
# =======================================================================
PLACES = [
    {
        "place_id": "p_marina",
        "name": "Marina Beach",
        "coordinates": {"lat": 13.0500, "lon": 80.2820},
        "full_text": "Marina Beach, Chennai’s longest beach, known for sunrise, lighthouse, and food stalls.",
        "category": "Beach",
        "related_places": ["p_santhome", "p_vivekanandar", "p_light_house"]
    },
    {
        "place_id": "p_kapaleeswarar",
        "name": "Kapaleeshwarar Temple",
        "coordinates": {"lat": 13.0330, "lon": 80.2690},
        "full_text": "Kapaleeshwarar Temple in Mylapore, an ancient Dravidian temple dedicated to Lord Shiva.",
        "category": "Temple",
        "related_places": ["p_mylapore_tank", "p_santhome"]
    },
    {
        "place_id": "p_santhome",
        "name": "Santhome Cathedral Basilica",
        "coordinates": {"lat": 13.0508, "lon": 80.2707},
        "full_text": "Santhome Cathedral Basilica is built over the tomb of St. Thomas, showcasing neo-gothic architecture.",
        "category": "Church",
        "related_places": ["p_kapaleeswarar", "p_marina"]
    },
    {
        "place_id": "p_valluvar",
        "name": "Valluvar Kottam",
        "coordinates": {"lat": 13.0560, "lon": 80.2400},
        "full_text": "Valluvar Kottam is a monument dedicated to Tamil poet Thiruvalluvar, featuring a massive stone chariot.",
        "category": "Monument",
        "related_places": ["p_tnagar", "p_kodambakkam"]
    },
    {
        "place_id": "p_guindy",
        "name": "Guindy National Park",
        "coordinates": {"lat": 13.0105, "lon": 80.2200},
        "full_text": "Guindy National Park hosts blackbucks, spotted deer, snakes, and over 100 bird species.",
        "category": "Park",
        "related_places": ["p_snakepark", "p_anna_univ"]
    },
    {
        "place_id": "p_egmore",
        "name": "Egmore Museum",
        "coordinates": {"lat": 13.0833, "lon": 80.2789},
        "full_text": "Egmore Museum displays ancient artifacts, bronze idols, and archaeological findings from Tamil Nadu.",
        "category": "Museum",
        "related_places": ["p_artgallery", "p_egmore_station"]
    },
    {
        "place_id": "p_parrys",
        "name": "Parrys Corner",
        "coordinates": {"lat": 13.0920, "lon": 80.2820},
        "full_text": "Parrys Corner is a historic trading hub of Chennai with colonial-era architecture.",
        "category": "Market",
        "related_places": ["p_georgetown", "p_fortstgeorge"]
    },
    {
        "place_id": "p_vivekanandar",
        "name": "Vivekanandar Illam",
        "coordinates": {"lat": 13.0762, "lon": 80.2640},
        "full_text": "Vivekanandar Illam showcases the life and teachings of Swami Vivekananda with 3D exhibits.",
        "category": "Museum",
        "related_places": ["p_marina", "p_kapaleeswarar"]
    },
    {
        "place_id": "p_fortstgeorge",
        "name": "Fort St. George",
        "coordinates": {"lat": 13.0800, "lon": 80.2861},
        "full_text": "Fort St. George, built in 1644, marks the foundation of modern Chennai and houses the Tamil Nadu Legislative Assembly.",
        "category": "Historic Fort",
        "related_places": ["p_parrys", "p_stmarys"]
    },
    {
        "place_id": "p_mahabalipuram",
        "name": "Mahabalipuram",
        "coordinates": {"lat": 12.6208, "lon": 80.1939},
        "full_text": "Mahabalipuram, a UNESCO World Heritage site, is famous for shore temples and monolithic rock-cut sculptures.",
        "category": "Heritage Site",
        "related_places": ["p_shore_temple", "p_arjunas_penance"]
    },
    {
        "place_id": "p_besantnagar",
        "name": "Besant Nagar Beach",
        "coordinates": {"lat": 13.0005, "lon": 80.2668},
        "full_text": "Besant Nagar Beach (Elliot’s Beach) is a serene spot known for youth hangouts and the Ashtalakshmi Temple.",
        "category": "Beach",
        "related_places": ["p_ashtalakshmi", "p_velankanni"]
    },
    {
        "place_id": "p_ashtalakshmi",
        "name": "Ashtalakshmi Temple",
        "coordinates": {"lat": 13.0014, "lon": 80.2718},
        "full_text": "Ashtalakshmi Temple near Elliot’s Beach is dedicated to Goddess Lakshmi in eight forms.",
        "category": "Temple",
        "related_places": ["p_besantnagar", "p_velankanni"]
    },
    {
        "place_id": "p_snakepark",
        "name": "Guindy Snake Park",
        "coordinates": {"lat": 13.0100, "lon": 80.2300},
        "full_text": "Guindy Snake Park exhibits reptiles like cobras, pythons, and monitor lizards, emphasizing conservation education.",
        "category": "Zoo",
        "related_places": ["p_guindy", "p_childrenspark"]
    },
    {
        "place_id": "p_planetarium",
        "name": "Birla Planetarium",
        "coordinates": {"lat": 13.0109, "lon": 80.2359},
        "full_text": "Birla Planetarium offers immersive astronomy shows and science exhibits in Tamil and English.",
        "category": "Science Center",
        "related_places": ["p_guindy", "p_anna_univ"]
    },
    {
        "place_id": "p_vandalur",
        "name": "Anna Zoological Park (Vandalur Zoo)",
        "coordinates": {"lat": 12.8791, "lon": 80.0815},
        "full_text": "Vandalur Zoo is one of the largest zoos in South Asia, home to tigers, elephants, and aviary species.",
        "category": "Zoo",
        "related_places": ["p_tambaram", "p_crocodilebank"]
    },
    {
        "place_id": "p_crocodilebank",
        "name": "Crocodile Bank",
        "coordinates": {"lat": 12.6593, "lon": 80.1989},
        "full_text": "Crocodile Bank conserves crocodiles, alligators, and gharials, located on the East Coast Road near Mahabalipuram.",
        "category": "Wildlife Sanctuary",
        "related_places": ["p_mahabalipuram", "p_vandalur"]
    },
    {
        "place_id": "p_pulicat",
        "name": "Pulicat Lake",
        "coordinates": {"lat": 13.4138, "lon": 80.3194},
        "full_text": "Pulicat Lake, the second largest brackish water lagoon in India, is known for flamingos and scenic boat rides.",
        "category": "Lake",
        "related_places": ["p_pulicat_bird_sanctuary", "p_ennore"]
    },
    {
        "place_id": "p_anna_memorial",
        "name": "Arignar Anna Memorial",
        "coordinates": {"lat": 13.0570, "lon": 80.2820},
        "full_text": "Arignar Anna Memorial is located on the Marina Beach promenade, honoring Tamil leader C.N. Annadurai.",
        "category": "Memorial",
        "related_places": ["p_mgr_memorial", "p_marina"]
    },
    {
        "place_id": "p_mgr_memorial",
        "name": "MGR Memorial",
        "coordinates": {"lat": 13.0572, "lon": 80.2825},
        "full_text": "MGR Memorial is a marble-clad structure dedicated to actor-politician M.G. Ramachandran.",
        "category": "Memorial",
        "related_places": ["p_anna_memorial", "p_marina"]
    },
    {
        "place_id": "p_highcourt",
        "name": "Madras High Court",
        "coordinates": {"lat": 13.0856, "lon": 80.2857},
        "full_text": "Madras High Court is one of the oldest in India, renowned for Indo-Saracenic architecture.",
        "category": "Historic Building",
        "related_places": ["p_fortstgeorge", "p_parrys"]
    },
]

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

# --- THIS IS THE FIRST FIX ---
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
# --- END OF FIRST FIX ---

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

def triple_text(place):
    triples = []
    for rel in place.get("related_places", []):
        triples.append(f"{place['place_id']} related_to {rel}")
    triples.append(f"{place['place_id']} is_a {place.get('category','place')}")
    return " . ".join(triples)

async def index_places():
    for place in PLACES:
        try:
            emb = await get_embedding(place["full_text"])
        except Exception:
            emb = await get_embedding(place.get("name", ""))
        place["embedding"] = emb

        rel_text = triple_text(place)
        try:
            place["relation_embedding"] = await get_embedding(rel_text)
        except Exception:
            place["relation_embedding"] = None

    print(f"Indexed {len(PLACES)} Chennai-region places.")
    print("Sample:", [{p['place_id']: list(p.keys())[:5]} for p in PLACES[:3]])


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

async def retrieve_local(query: str, k: int = 3, allow_wiki_fallback: bool = True):
    query_emb = np.array(await get_embedding(query), dtype=float)
    scored = []
    best_score = 0.0
    for place in PLACES:
        place_emb = np.array(place.get("embedding", np.zeros_like(query_emb)))
        score_main = cosine_sim(query_emb, place_emb)
        rel_emb = place.get("relation_embedding")
        score_rel = 0.0
        if rel_emb is not None:
            score_rel = cosine_sim(query_emb, np.array(rel_emb))
        combined_score = 0.7 * score_main + 0.3 * score_rel
        scored.append((combined_score, place))
        best_score = max(best_score, combined_score)
    scored.sort(key=lambda x: x[0], reverse=True)
    top_local = []
    for sc, place in scored[:k]:
        top_local.append({
            "id": place["place_id"], "name": place["name"], "coordinates": place.get("coordinates"),
            "full_text": place["full_text"], "category": place.get("category"), "score": float(sc),
            "source": "local", "embedding": place.get("embedding")
        })
    if allow_wiki_fallback and (best_score < 0.65 or len(top_local) < k):
        try:
            search_results = await run_sync(wikipedia.search, query)
            if search_results:
                best_title = search_results[0]
                try:
                    page = await run_sync(wikipedia.page, best_title, auto_suggest=False)
                except wiki_exceptions.DisambiguationError as dis_e:
                    print(f"⚠️ Wikipedia disambiguation error for '{best_title}'. Trying second result.")
                    if len(search_results) > 1:
                        best_title = search_results[1]
                        page = await run_sync(wikipedia.page, best_title, auto_suggest=False)
                    else:
                        print("No other wiki results to try.")
                        return top_local
                wiki_text = page.summary or page.content[:2000]
                candidates = re.findall(r'\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\b', wiki_text)
                words = [w.split()[-1] for w in candidates]
                common_suffixes = {}
                for w in words:
                    common_suffixes[w] = common_suffixes.get(w, 0) + 1
                likely_place_suffixes = [w for w, c in common_suffixes.items() if c > 1 or w.lower() in query.lower()]
                matches = [c for c in candidates if c.split()[-1] in likely_place_suffixes]
                unique_places = list(dict.fromkeys(matches))
                if unique_places:
                    print(f"✅ Auto-extracted place names: {', '.join(unique_places[:6])}")
                    for pname in unique_places[:k]:
                        top_local.append({
                            "id": f"wiki::{pname.replace(' ', '_')}", "name": pname, "coordinates": None,
                            "full_text": f"{pname} is mentioned in the article {page.title}.",
                            "category": "Wikipedia (derived)", "score": 0.48, "source": "wikipedia"
                        })
                else:
                    top_local.append({
                        "id": f"wiki::{page.title}", "name": page.title, "coordinates": None,
                        "full_text": wiki_text[:1200], "category": "Wikipedia", "score": 0.5, "source": "wikipedia"
                    })
                    print(f"✅ Wikipedia fallback added: {page.title}")
            else:
                print(f"⚠️ No Wikipedia results found for '{query}'.")
        except wiki_exceptions.PageError:
             print(f"⚠️ Wikipedia PageError: No page found for '{query}'.")
        except Exception as e:
            print(f"Wikipedia error: {e}")
    return top_local

def _hash_text(text, voice="default", style="neutral"):
    combined = f"{text}|{voice}|{style}"
    return hashlib.md5(combined.encode("utf-8")).hexdigest()

async def summarize_local(text: str, style: str = "summary", lang: str = "en") -> dict:
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

# --- THIS FUNCTION IS NOW FIXED ---
async def tts_local(text: str, voice="default", style="neutral", fmt="mp3", bucket=None) -> dict:
    text_hash = _hash_text(text, voice, style)
    filename = f"{text_hash[:12]}.{fmt}"
    
    # Get the OS-specific temporary directory
    temp_dir = tempfile.gettempdir() 
    # Create a valid file path for the current OS
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
# --- END OF FIX ---

# =======================================================================
# Agent Logic Functions
# =======================================================================

# --- THIS FUNCTION IS NOW FIXED ---
async def get_json_plan_from_llm(user_text, user_profile_summary, conversation):
    """
    Generates a structured plan for execution.
    """
    try:
        # This prompt is now clearer for the AI
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
# --- END OF FIX ---

async def execute_step(step: Dict[str, Any], session_ctx: Dict[str, Any]):
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
    
    # --- THIS PROMPT IS ALSO FIXED to be stricter ---
    prompt = f"""
    You are a JSON-only API. You must answer the user's question based *only* on the provided SOURCES.
    If SOURCES is "No sources.", just have a friendly conversation (e.g., if user said "hello", say "hello" back).
    
    User Question: {user_text}
    SOURCES:
    {sources_text}
    
    Your JSON response: {{"answer": "...", "sources": ["..."], "confidence": 0.0}}
    """
    # --- END OF FIX ---
    
    out_text = await grok_generate(prompt, max_tokens=300)
    j = extract_json(out_text) or out_text
    try:
        out = json.loads(j)
    except:
        # If the AI *still* fails to send JSON, build a failsafe response
        fallback_answer = "I'm sorry, I couldn't synthesize a response from my sources."
        if not sources_text or sources_text == "No sources.":
            fallback_answer = "Hello! How can I help you today?" # Failsafe for "hii"
            
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
    await index_places() 
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
    print("Starting Python AI Bot server on ",os.getenv("PORT"))
    uvicorn.run(app, host="0.0.0.0", port=5001)