"""Tests for the sync server. Run with: python -m unittest sync-server/test_server.py"""

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import server  # noqa: E402


class SyncServerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        server.GARMIN_DIR = self.tmp.name
        server.FOOD_LOG_PATH = os.path.join(self.tmp.name, "food_log_export.json")
        server.TARGETS_PATH = os.path.join(self.tmp.name, "macro_targets.json")
        server.SYNC_API_KEY = ""
        self.client = server.app.test_client()

    def tearDown(self):
        self.tmp.cleanup()

    def get_state(self, rev=None):
        res = self.client.get("/sync/state" + (f"?rev={rev}" if rev else ""))
        self.assertEqual(res.status_code, 200)
        return res.get_json()

    def put_state(self, base_rev, data):
        return self.client.put("/sync/state", json={"baseRev": base_rev, "data": data})

    def test_empty_server_returns_empty_data(self):
        state = self.get_state()
        self.assertEqual(state["data"], {})
        self.assertTrue(state["rev"])

    def test_put_then_get_round_trips(self):
        rev = self.get_state()["rev"]
        data = {"logs": [{"date": "2026-10-06", "entries": [{"id": "a", "kcal": 100}]}], "_sync": {"version": 1}}
        res = self.put_state(rev, data)
        self.assertEqual(res.status_code, 200)
        new_rev = res.get_json()["rev"]
        state = self.get_state()
        self.assertEqual(state["data"], data)
        self.assertEqual(state["rev"], new_rev)

    def test_stale_put_is_rejected(self):
        rev = self.get_state()["rev"]
        self.assertEqual(self.put_state(rev, {"logs": [], "_sync": {}}).status_code, 200)
        # A second device still holding the old revision must merge again
        res = self.put_state(rev, {"logs": [{"date": "x", "entries": []}], "_sync": {}})
        self.assertEqual(res.status_code, 409)
        self.assertEqual(self.get_state()["data"]["logs"], [])

    def test_unchanged_revision_skips_the_data(self):
        rev = self.get_state()["rev"]
        rev = self.put_state(rev, {"logs": [], "_sync": {}}).get_json()["rev"]
        state = self.get_state(rev)
        self.assertTrue(state["unchanged"])
        self.assertNotIn("data", state)

    def test_direct_file_edits_change_the_revision(self):
        rev = self.get_state()["rev"]
        rev = self.put_state(rev, {"logs": [{"date": "d", "entries": [{"id": "a", "fibre": 0}]}], "_sync": {}}).get_json()["rev"]
        with open(server.FOOD_LOG_PATH) as f:
            data = json.load(f)
        data["logs"][0]["entries"][0]["fibre"] = 4.2  # an agent filling in fibre
        with open(server.FOOD_LOG_PATH, "w") as f:
            json.dump(data, f)
        state = self.get_state(rev)
        self.assertNotIn("unchanged", state)
        self.assertEqual(state["data"]["logs"][0]["entries"][0]["fibre"], 4.2)

    def test_put_keeps_keys_the_app_does_not_know(self):
        with open(server.FOOD_LOG_PATH, "w") as f:
            json.dump({"logs": [], "agentNotes": {"x": 1}, "_sync": {}}, f)
        rev = self.get_state()["rev"]
        res = self.put_state(rev, {"logs": [{"date": "d", "entries": []}], "_sync": {}})
        self.assertEqual(res.status_code, 200)
        state = self.get_state()
        self.assertEqual(state["data"]["agentNotes"], {"x": 1})
        self.assertEqual(state["rev"], res.get_json()["rev"])

    def test_bad_put_body_is_rejected(self):
        self.assertEqual(self.client.put("/sync/state", json={"baseRev": "x"}).status_code, 400)
        self.assertEqual(self.client.put("/sync/state", data="nope").status_code, 400)

    def test_corrupt_file_is_not_overwritten(self):
        with open(server.FOOD_LOG_PATH, "w") as f:
            f.write("{not json")
        self.assertEqual(self.client.get("/sync/state").status_code, 500)
        self.assertEqual(self.put_state("whatever", {"logs": []}).status_code, 500)
        with open(server.FOOD_LOG_PATH) as f:
            self.assertEqual(f.read(), "{not json")

    def test_legacy_push_still_works_before_two_way_sync(self):
        res = self.client.post("/sync/food-log", json={"logs": [{"date": "d", "entries": [{"id": "a", "fibre": 0}]}]})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.client.get("/sync/food-log").get_json()["logs"][0]["date"], "d")

    def test_legacy_push_keeps_enriched_fibre(self):
        with open(server.FOOD_LOG_PATH, "w") as f:
            json.dump({"logs": [{"date": "d", "entries": [{"id": "a", "fibre": 3}]}]}, f)
        self.client.post("/sync/food-log", json={"logs": [{"date": "d", "entries": [{"id": "a", "fibre": 0}]}]})
        self.assertEqual(self.client.get("/sync/food-log").get_json()["logs"][0]["entries"][0]["fibre"], 3)

    def test_legacy_push_cannot_overwrite_two_way_data(self):
        rev = self.get_state()["rev"]
        self.put_state(rev, {"logs": [{"date": "d", "entries": [{"id": "a"}]}], "_sync": {}})
        res = self.client.post("/sync/food-log", json={"logs": []})
        self.assertEqual(res.status_code, 409)
        self.assertEqual(len(self.get_state()["data"]["logs"]), 1)

    def test_api_key_is_required_when_set(self):
        server.SYNC_API_KEY = "secret"
        self.assertEqual(self.client.get("/sync/state").status_code, 401)
        ok = self.client.get("/sync/state", headers={"Authorization": "Bearer secret"})
        self.assertEqual(ok.status_code, 200)


if __name__ == "__main__":
    unittest.main()
