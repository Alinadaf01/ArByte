import json

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.settings.models import ApiCredential


class ApiCredentialValidationTests(TestCase):
    def test_active_credential_requires_nonempty_credentials(self):
        credential = ApiCredential(service="zarinpal", is_active=True, credentials="")
        with self.assertRaises(ValidationError):
            credential.full_clean()

    def test_active_credential_requires_valid_json(self):
        credential = ApiCredential(service="zarinpal", is_active=True, credentials="not json")
        with self.assertRaises(ValidationError):
            credential.full_clean()

    def test_active_credential_requires_nonempty_object(self):
        credential = ApiCredential(service="zarinpal", is_active=True, credentials="{}")
        with self.assertRaises(ValidationError):
            credential.full_clean()

    def test_active_credential_with_valid_json_passes(self):
        credential = ApiCredential(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "abc"})
        )
        credential.full_clean()  # must not raise

    def test_inactive_credential_with_empty_credentials_is_allowed(self):
        credential = ApiCredential(service="zarinpal", is_active=False, credentials="")
        credential.full_clean()  # must not raise — inactive rows can be placeholders

    def test_has_valid_credentials_helper(self):
        valid = ApiCredential.objects.create(
            service="zarinpal", is_active=True, credentials=json.dumps({"merchantId": "abc"})
        )
        self.assertTrue(valid.has_valid_credentials())

        # Bypasses clean() on purpose (bulk update / fixture / migration path)
        # to prove the public endpoint can't be fooled by a row that skipped
        # the model-form validation.
        broken = ApiCredential.objects.create(service="idpay", is_active=True, credentials="")
        self.assertFalse(broken.has_valid_credentials())

    # PaymentGatewayListApiTests (public `payment-gateway-list` endpoint)
    # removed in D-01 along with the public API layer it tested — rebuilt
    # against the ArByte contract in D-03/D-04/D-05.
