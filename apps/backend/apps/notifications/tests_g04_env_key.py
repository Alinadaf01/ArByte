"""G-04 — کلید کاوه‌نگار: پنل اولویت دارد، env فقط وقتی پنل خالی است."""

import json
from unittest.mock import patch

from django.test import TestCase

from apps.notifications.kavenegar_client import get_kavenegar_client
from apps.settings.models import ApiCredential


class KavenegarKeySourceTests(TestCase):
    @patch("kavenegar.KavenegarAPI")
    def test_env_fallback_and_panel_precedence(self, api):
        with patch.dict("os.environ", {"KAVENEGAR_API_KEY": "ENV-KEY"}):
            get_kavenegar_client()
            api.assert_called_with("ENV-KEY")
            ApiCredential.objects.create(service="kavenegar", credentials=json.dumps({"apiKey": "PANEL-KEY"}), is_active=True)
            get_kavenegar_client()
            api.assert_called_with("PANEL-KEY")

    def test_no_key_anywhere_raises(self):
        with patch.dict("os.environ", {"KAVENEGAR_API_KEY": ""}), self.assertRaises(RuntimeError):
            get_kavenegar_client()
