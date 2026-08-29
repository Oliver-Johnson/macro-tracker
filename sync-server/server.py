"""Macro Sync Server — bridges macro-tracker PWA with local fitness agents."""

import functools
import json
import os
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


@app.route("/health")
@require_auth
def health():
    return jsonify({"status": "ok"})


@app.route("/sync/food-log", methods=["GET", "POST"])
@require_auth
def food_log():
    if request.method == "POST":
        data, err = parse_json_body(("logs", "recipes", "customFoods", "settings"))
        if err:
            return err
        os.makedirs(GARMIN_DIR, exist_ok=True)
        # Preserve non-zero fibre/sugar/sodium from existing server data
        # so manual enrichment isn't wiped by phone syncs
        if os.path.exists(FOOD_LOG_PATH):
            try:
                with open(FOOD_LOG_PATH) as f:
                    existing = json.load(f)
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
        with open(FOOD_LOG_PATH, "w") as f:
            json.dump(data, f, indent=2)
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
