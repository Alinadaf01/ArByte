import secrets

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

phone_validator = RegexValidator(
    regex=r"^09\d{9}$",
    message="شماره موبایل باید به‌صورت ۰۹xxxxxxxxx باشد.",
)


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, phone, password, **extra_fields):
        if not phone:
            raise ValueError("کاربر باید شماره موبایل داشته باشد.")
        user = self.model(phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(phone, password, **extra_fields)

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_verified", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("سوپریوزر باید is_staff=True باشد.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("سوپریوزر باید is_superuser=True باشد.")
        return self._create_user(phone, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Staff can create a user directly with is_verified=True, bypassing OTP."""

    phone = models.CharField(max_length=11, unique=True, validators=[phone_validator])
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    # Per-admin, not global — the dashboard's "since your last visit" feed
    # (BACKEND-TASK.md §6, ناحیه ۴) needs each staff member's own watermark.
    last_dashboard_visit = models.DateTimeField(blank=True, null=True)
    # §7.6 — set when a superuser resets this user's password; forces a
    # change-password step on the very next login instead of letting the
    # one-time generated password linger indefinitely.
    must_change_password = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.phone

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.phone

    def get_short_name(self):
        return self.first_name or self.phone


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    title = models.CharField(max_length=50, blank=True)
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    line = models.TextField()
    postal_code = models.CharField(max_length=10)
    receiver_name = models.CharField(max_length=150)
    receiver_phone = models.CharField(max_length=11, validators=[phone_validator])
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return f"{self.title or self.city} — {self.user.phone}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            Address.objects.filter(user_id=self.user_id).exclude(pk=self.pk).update(is_default=False)


class OTPCode(models.Model):
    EXPIRY_MINUTES = 2
    MAX_ATTEMPTS = 5
    RATE_LIMIT_COUNT = 3
    RATE_LIMIT_MINUTES = 10

    phone = models.CharField(max_length=11, validators=[phone_validator])
    code_hash = models.CharField(max_length=128)
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["phone", "created_at"])]

    def __str__(self):
        return f"OTP for {self.phone}"

    @classmethod
    def issue(cls, phone: str, raw_code: str) -> "OTPCode":
        return cls.objects.create(
            phone=phone,
            code_hash=make_password(raw_code),
            expires_at=timezone.now() + timezone.timedelta(minutes=cls.EXPIRY_MINUTES),
        )

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def verify(self, raw_code: str) -> bool:
        if self.used_at or self.is_expired() or self.attempts >= self.MAX_ATTEMPTS:
            return False
        self.attempts += 1
        ok = check_password(raw_code, self.code_hash)
        if ok:
            self.used_at = timezone.now()
        self.save(update_fields=["attempts", "used_at"])
        return ok


class ImpersonationTicket(models.Model):
    """§7.6-۲ (redesigned) — the admin panel never receives a real JWT for the
    impersonated session directly; it gets one of these, single-use and
    60-seconds-lived. The storefront's /impersonate route is the only thing
    that ever exchanges it for a real (restricted) access token, via POST —
    so the powerful credential itself never sits in a URL, browser history,
    server access log, or Referer header. A leaked ticket is worthless
    within a moment, which is the whole point."""

    TICKET_LIFETIME_SECONDS = 60

    token = models.CharField(max_length=64, unique=True, db_index=True)
    target_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="+")
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(blank=True, null=True)

    @classmethod
    def issue(cls, *, target_user: "User", issued_by: "User") -> "ImpersonationTicket":
        return cls.objects.create(
            token=secrets.token_urlsafe(32),
            target_user=target_user,
            issued_by=issued_by,
            expires_at=timezone.now() + timezone.timedelta(seconds=cls.TICKET_LIFETIME_SECONDS),
        )

    def is_valid(self) -> bool:
        return self.used_at is None and timezone.now() < self.expires_at
