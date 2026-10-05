"""AUDIT-6 — احراز درخواست‌های ترب (مستند Torob API v3، «امنیت درگاه»).

ترب در هر درخواست یک JWT در هدر `X-Torob-Token` می‌فرستد که با کلید
خصوصی ترب امضا شده و ما با کلید عمومی ترب بررسی می‌کنیم. کلید عمومی و
جزئیات آن در صفحه‌ی جدای «torob_api_token_guide» پنل ترب است و در ریپو
نیست؛ پس الگوریتم حدس زده نمی‌شود: فقط الگوریتم‌های نامتقارنِ سازگار با
نوع همان کلید پذیرفته می‌شوند (HS*/none هرگز).

کلید در ApiCredential(service="torob") رمزشده ذخیره می‌شود؛ `is_active`
همان کلید روشن/خاموش اتصال ترب است. توکن هرگز لاگ نمی‌شود.
"""

import hashlib
import json
import re
from dataclasses import dataclass

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed448, ed25519, rsa

from apps.settings.models import ApiCredential

TOKEN_HEADER = "HTTP_X_TOROB_TOKEN"

_RSA_ALGORITHMS = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512"]
_EC_ALGORITHMS = ["ES256", "ES384", "ES512"]
_PEM_RE = re.compile(r"-----BEGIN ([A-Z ]+)-----(.*?)-----END \1-----", re.S)


class TorobAuthError(Exception):
    """پیام امن برای پاسخ (بدون جزئیات توکن)."""


@dataclass(frozen=True)
class TorobKey:
    key: object
    algorithms: list[str]
    fingerprint: str


def normalize_pem(raw: str) -> str:
    """کلید چسبانده‌شده در یک خط (فرم پنل) را به PEM استاندارد برمی‌گرداند."""
    raw = (raw or "").strip().replace("\\n", "\n")
    match = _PEM_RE.search(raw)
    if not match:
        return raw
    label, body = match.group(1), re.sub(r"\s+", "", match.group(2))
    lines = [body[i : i + 64] for i in range(0, len(body), 64)]
    return "\n".join([f"-----BEGIN {label}-----", *lines, f"-----END {label}-----", ""])


def load_public_key(pem: str) -> TorobKey:
    pem = normalize_pem(pem)
    try:
        key = serialization.load_pem_public_key(pem.encode())
    except ValueError as exc:
        raise TorobAuthError("کلید عمومی ترب معتبر نیست (PEM).") from exc
    if isinstance(key, rsa.RSAPublicKey):
        algorithms = _RSA_ALGORITHMS
    elif isinstance(key, ec.EllipticCurvePublicKey):
        algorithms = _EC_ALGORITHMS
    elif isinstance(key, ed25519.Ed25519PublicKey | ed448.Ed448PublicKey):
        algorithms = ["EdDSA"]
    else:
        raise TorobAuthError("نوع کلید عمومی ترب پشتیبانی نمی‌شود.")
    der = key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    return TorobKey(key=key, algorithms=algorithms, fingerprint=hashlib.sha256(der).hexdigest()[:16])


def active_credential() -> ApiCredential | None:
    return ApiCredential.objects.filter(service="torob", is_active=True).order_by("order", "pk").first()


def configured_key(credential: ApiCredential | None = None) -> TorobKey | None:
    credential = credential or active_credential()
    if credential is None or not credential.has_valid_credentials():
        return None
    data = json.loads(credential.credentials)
    pem = data.get("publicKey") or ""
    return load_public_key(pem) if pem.strip() else None


def verify_request(request) -> None:
    """درخواست ترب را رد می‌کند (TorobAuthError) مگر JWT معتبر با کلید عمومی ترب."""
    credential = active_credential()
    if credential is None:
        raise TorobAuthError("اتصال ترب در پنل فعال نیست.")
    key = configured_key(credential)
    if key is None:
        raise TorobAuthError("کلید عمومی ترب در پنل ثبت نشده است.")
    token = request.META.get(TOKEN_HEADER, "").strip()
    if not token:
        raise TorobAuthError("X-Torob-Token is missing.")
    try:
        jwt.decode(
            token,
            key.key,
            algorithms=key.algorithms,
            # aud/iss در مستند v3 نیامده؛ امضا و (اگر باشد) exp/nbf بررسی می‌شوند.
            options={"verify_aud": False, "require": []},
            leeway=30,
        )
    except jwt.InvalidTokenError as exc:
        raise TorobAuthError("X-Torob-Token is invalid.") from exc
