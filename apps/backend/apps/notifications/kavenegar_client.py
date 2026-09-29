import json

from apps.settings.models import ApiCredential


def get_kavenegar_client():
    """کلید از ApiCredential پنل (رمزشده، قابل ویرایش) — اولویت اول. G-04: اگر
    در پنل کلید فعالی نبود، `KAVENEGAR_API_KEY` از env (برای راه‌اندازی اولیه)."""
    from decouple import config
    from kavenegar import KavenegarAPI

    credential = ApiCredential.objects.filter(service="kavenegar", is_active=True).first()
    if not credential:
        env_key = config("KAVENEGAR_API_KEY", default="").strip()
        if env_key:
            return KavenegarAPI(env_key)
        raise RuntimeError("هیچ کلید کاوه‌نگاری تنظیم نشده (پنل یا KAVENEGAR_API_KEY).")
    try:
        data = json.loads(credential.credentials)
    except (TypeError, ValueError) as exc:
        raise RuntimeError("credentials کاوه‌نگار JSON معتبر نیست.") from exc
    api_key = data.get("apiKey")
    if not api_key:
        raise RuntimeError("ApiCredential کاوه‌نگار فاقد apiKey است.")
    return KavenegarAPI(api_key)
