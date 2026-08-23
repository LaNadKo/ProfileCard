import unittest
import time
import os
import sys
import tempfile
import sqlite3

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server import (
    filter_public_projects,
    allow_action,
    should_touch_visit,
    get_public_system_status,
    open_db,
    init_db,
    MAX_JSON_BODY_BYTES,
    MAX_RATE_BUCKETS,
    rate_buckets,
    visit_touch_cache,
    mask_ip,
    parse_user_agent
)

class TestServerHardening(unittest.TestCase):
    def test_filter_public_projects(self):
        repos = [
            {"id": 1, "name": "public-repo", "isPrivate": False, "private": False},
            {"id": 2, "name": "secret-infra", "isPrivate": True, "private": True},
            {"id": 3, "name": "another-public", "isPrivate": False},
            {"id": 4, "name": "old-private", "private": True}
        ]
        filtered = filter_public_projects(repos)
        self.assertEqual(len(filtered), 2)
        names = [r["name"] for r in filtered]
        self.assertIn("public-repo", names)
        self.assertIn("another-public", names)
        self.assertNotIn("secret-infra", names)
        self.assertNotIn("old-private", names)

    def test_public_system_status_dto(self):
        dto = get_public_system_status()
        self.assertIn("state", dto)
        self.assertEqual(dto["state"], "online")
        self.assertIn("uptimeSeconds", dto)
        self.assertIn("load", dto)
        self.assertIsInstance(dto["load"], dict)
        self.assertIn("1m", dto["load"])
        self.assertIn("5m", dto["load"])
        self.assertIn("15m", dto["load"])
        self.assertIn("memoryPercent", dto)
        self.assertIn("diskPercent", dto)
        self.assertIn("timestamp", dto)

        # Ensure no sensitive system properties leaked
        self.assertNotIn("kernel", dto)
        self.assertNotIn("hostname", dto)
        self.assertNotIn("shell", dto)
        self.assertNotIn("packages", dto)

    def test_rate_limiter_and_bounded_memory(self):
        test_ip = "198.51.100.25"
        # 3 actions per 5 seconds
        for _ in range(3):
            self.assertTrue(allow_action(test_ip, "test_action", limit=3, window_seconds=5))
        # 4th action should be blocked
        self.assertFalse(allow_action(test_ip, "test_action", limit=3, window_seconds=5))

    def test_visit_touch_throttling(self):
        v_key = "test_visitor_key_123"
        # First touch should be allowed
        self.assertTrue(should_touch_visit(v_key))
        # Second touch immediately should be throttled
        self.assertFalse(should_touch_visit(v_key))

    def test_mask_ip_and_user_agent(self):
        self.assertEqual(mask_ip("203.0.113.42"), "203.0.***.***")
        self.assertEqual(mask_ip("2001:db8:85a3::8a2e:370:7334"), "2001:db8:****:****")
        ua = parse_user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        self.assertIn("Windows", ua)
        self.assertIn("Chrome", ua)

if __name__ == "__main__":
    unittest.main()
