#!/usr/bin/env python3
"""
Unit tests for ProfileCard / Whoami Identity Backend
Validates health probes, DTO structures, public repo filters, and guestbook bounds.
"""
import unittest
import json
import os
import sys

# Ensure backend directory is in path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import server

class TestWhoamiBackend(unittest.TestCase):
    def setUp(self):
        server.get_ip_hash_secret()

    def test_health_live(self):
        # Verification of live probe contract
        self.assertTrue(hasattr(server, 'open_db'))

    def test_system_status_dto(self):
        dto = server.get_public_system_status()
        self.assertIn("state", dto)
        self.assertEqual(dto["state"], "online")
        self.assertIn("uptimeSeconds", dto)
        self.assertIn("load", dto)
        self.assertIn("memoryPercent", dto)
        self.assertIn("diskPercent", dto)
        self.assertIn("timestamp", dto)

    def test_projects_public_filter(self):
        raw_repos = [
            {"id": 1, "name": "public-repo", "isPrivate": False, "description": "Public Repo"},
            {"id": 2, "name": "secret-repo", "isPrivate": True, "description": "Secret Repo"},
            {"id": 3, "name": "another-secret", "private": True, "description": "Hidden Repo"}
        ]
        filtered = server.filter_public_projects(raw_repos)
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["name"], "public-repo")

    def test_guestbook_validation(self):
        # Empty name should fail
        success, msg = server.add_guestbook_message("127.0.0.1", "", "Valid text message")
        self.assertFalse(success)
        self.assertIn("Имя должно содержать минимум", msg)

        # Empty text should fail
        success, msg = server.add_guestbook_message("127.0.0.1", "Valid Name", "")
        self.assertFalse(success)
        self.assertIn("Текст сообщения слишком короткий", msg)

    def test_guestbook_oversize_payload(self):
        oversized_text = "A" * (server.GUESTBOOK_MAX_MESSAGE_LENGTH + 50)
        success, msg = server.add_guestbook_message("127.0.0.1", "Valid Name", oversized_text)
        self.assertFalse(success)
        self.assertIn("не должно превышать", msg)

    def test_rate_limiter(self):
        test_ip = "192.0.2.1"
        # Burst 3 actions allowed in window
        r1 = server.allow_action(test_ip, "test_action", limit=3, window_seconds=60)
        r2 = server.allow_action(test_ip, "test_action", limit=3, window_seconds=60)
        r3 = server.allow_action(test_ip, "test_action", limit=3, window_seconds=60)
        r4 = server.allow_action(test_ip, "test_action", limit=3, window_seconds=60)

        self.assertTrue(r1)
        self.assertTrue(r2)
        self.assertTrue(r3)
        self.assertFalse(r4)

if __name__ == "__main__":
    unittest.main()
