"""Macro Sync Server — bridges macro-tracker PWA with local fitness agents."""

import functools
import hashlib
import json
import os
import tempfile
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Reject request bodies larger than 5MB (Flask returns 413 automatically).
MAX_BODY_BYTES = 5 * 1024 * 1024
app.config["MAX_CONTENT_LENGTH"] = MAX_BODY_BYTES

SYNC_API_KEY = os.environ.get("SYNC_API_KEY", "")

GARMIN_DIR = os.path.expanduser("~/.claude/garmin-tools")
FOOD_LOG_PATH = os.path.join(GARMIN_DIR, "food_log_export.json")
TARGETS_PATH = os.path.join(GARMIN_DIR, "macro_targets.json")

# Serialises read-compare-write on the food log so two devices can't both win
STATE_LOCK = threading.Lock()

# Top-level keys the app syncs. Anything else in the file (for example added by
# agents) is kept when the app uploads.
APP_KEYS = {"logs", "recipes", "customFoods", "settings", "dailyTargets", "weightLog",
            "waterLog", "exerciseLog", "ifSettings", "ifLog", "_sync"}

DEFAULT_TARGETS = {
    "date": "",
    "day_type": "rest",
    "protein": 170,
    "carbs": 285,
    "fat": 70,
    "kcal": 2400
}


def require_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if SYNC_API_KEY:
            auth = request.headers.get("Authorization", "")
            if auth != f"Bearer {SYNC_API_KEY}":
                return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def parse_json_body(expected_keys):
    """Parse the request body as JSON and validate its shape.

    Returns (data, None) on success, or (None, (response, status)) on failure.
    """
    try:
        data = request.get_json(force=True, silent=True)
    except Exception:
        data = None
    if not isinstance(data, dict):
        return None, (jsonify({"error": "Invalid JSON body"}), 400)
    if not any(k in data for k in expected_keys):
        return None, (jsonify({"error": "Missing expected keys"}), 400)
    return data, None


def read_store():
    """Return the stored food log export, or {} if nothing has been synced yet."""
    if not os.path.exists(FOOD_LOG_PATH):
        return {}
    with open(FOOD_LOG_PATH) as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("food_log_export.json does not hold a JSON object")
    return data


def write_store(data):
    """Write the food log atomically, so a crash never leaves half a file."""
    os.makedirs(GARMIN_DIR, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=GARMIN_DIR, prefix=".food_log_export.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp_path, FOOD_LOG_PATH)
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


def revision(data):
    """A short hash of the stored data. It changes whenever the data does,
    including edits made to the file directly (for example by enrichment agents)."""
    blob = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


@app.route("/health")
@require_auth
def health():
    return jsonify({"status": "ok"})


@app.route("/sync/state", methods=["GET", "PUT"])
@require_auth
def sync_state():
    """Two-way sync. The app fetches the stored data and its revision, merges it
    with its own data record by record, then PUTs the result with the revision it
    started from. If another device synced in between, the PUT gets 409 and the
    app merges again, so neither device's changes are lost."""
    with STATE_LOCK:
        try:
            current = read_store()
        except ValueError as e:
            return jsonify({"error": str(e)}), 500
        rev = revision(current)
        if request.method == "GET":
            if request.args.get("rev") == rev:
                return jsonify({"rev": rev, "unchanged": True})
            return jsonify({"rev": rev, "data": current})

        body = request.get_json(force=True, silent=True)
        if not isinstance(body, dict) or not isinstance(body.get("data"), dict):
            return jsonify({"error": "Expected a JSON body with baseRev and data"}), 400
        if body.get("baseRev") != rev:
            return jsonify({"error": "The data changed since you fetched it; sync again", "rev": rev}), 409
        new = dict(body["data"])
        for k, v in current.items():
            if k not in APP_KEYS and k not in new:
                new[k] = v
        write_store(new)
        return jsonify({"rev": revision(new)})


@app.route("/sync/food-log", methods=["GET", "POST"])
@require_auth
def food_log():
    if request.method == "POST":
        data, err = parse_json_body(("logs", "recipes", "customFoods", "settings"))
        if err:
            return err
        os.makedirs(GARMIN_DIR, exist_ok=True)
        # Held from the read to the write, so a two-way sync can't land in between
        # and then be overwritten by this push
        with STATE_LOCK:
            # Preserve non-zero fibre/sugar/sodium from existing server data
            # so manual enrichment isn't wiped by phone syncs
            if os.path.exists(FOOD_LOG_PATH):
                try:
                    with open(FOOD_LOG_PATH) as f:
                        existing = json.load(f)
                    # A one-way push from an old copy of the app would overwrite
                    # changes other devices made through two-way sync
                    if isinstance(existing, dict) and "_sync" in existing:
                        return jsonify({"error": "This server uses two-way sync. Update the app and sync again."}), 409
                    existing_by_id = {}
                    for day in existing.get("logs", []):
                        for entry in day.get("entries", []):
                            if entry.get("id"):
                                existing_by_id[entry["id"]] = entry
                    for day in data.get("logs", []):
                        for entry in day.get("entries", []):
                            eid = entry.get("id")
                            if eid and eid in existing_by_id:
                                for field in ("fibre", "sugar", "sodium"):
                                    if not entry.get(field) and existing_by_id[eid].get(field):
                                        entry[field] = existing_by_id[eid][field]
                except Exception:
                    pass
            write_store(data)
        return jsonify({"status": "saved"})
    else:
        if os.path.exists(FOOD_LOG_PATH):
            with open(FOOD_LOG_PATH) as f:
                return jsonify(json.load(f))
        return jsonify({})


@app.route("/sync/targets", methods=["GET", "POST"])
@require_auth
def targets():
    if request.method == "POST":
        data, err = parse_json_body(("date", "kcal", "protein", "carbs", "fat", "day_type"))
        if err:
            return err
        os.makedirs(GARMIN_DIR, exist_ok=True)
        with open(TARGETS_PATH, "w") as f:
            json.dump(data, f, indent=2)
        return jsonify({"status": "saved"})
    else:
        if os.path.exists(TARGETS_PATH):
            with open(TARGETS_PATH) as f:
                return jsonify(json.load(f))
        return jsonify(DEFAULT_TARGETS)


if __name__ == "__main__":
    if SYNC_API_KEY:
        print(f"Auth enabled. Key: {SYNC_API_KEY[:8]}...")
    else:
        print("WARNING: SYNC_API_KEY not set — running without authentication")
    app.run(host="0.0.0.0", port=5001)
