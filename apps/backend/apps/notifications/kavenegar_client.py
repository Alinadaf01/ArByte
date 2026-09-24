import json

from apps.settings.models import ApiCredential


def get_kavenegar_client():
    """Keys come from ApiCredential (encrypted, panel-editable) — never env vars."""
    from kavenegar import KavenegarAPI

    credential = ApiCredential.objects.filter(service="kavenegar", is_active=True).first()
    if not credential:
        raise RuntimeError("هیچ ApiCredential فعالی برای kavenegar تنظیم نشده است.")
    try:
        data = json.loads(credential.credentials)
    except (TypeError, ValueError) as exc:
        raise RuntimeError("credentials کاوه‌نگار JSON معتبر نیست.") from exc
    api_key = data.get("apiKey")
    if not api_key:
        raise RuntimeError("ApiCredential کاوه‌نگار فاقد apiKey است.")
    return KavenegarAPI(api_key)
