from .kavenegar_tokens import build_kavenegar_tokens
from .models import SmsLog, SmsTemplate
from .tasks import send_sms_task


class NotificationService:
    """The only sanctioned way to send an SMS — never call Kavenegar from a view."""

    @staticmethod
    def send_sms(phone: str, template_key: str, context: dict | None = None) -> SmsLog:
        context = context or {}
        template = SmsTemplate.objects.filter(key=template_key, is_active=True).first()
        if not template:
            return SmsLog.objects.create(
                phone=phone,
                body="",
                status="failed",
                error=f'قالب پیامک "{template_key}" یافت نشد یا غیرفعال است.',
            )

        if template.kavenegar_template_name:
            tokens = build_kavenegar_tokens(template.kavenegar_token_map, context)
            log = SmsLog.objects.create(
                phone=phone,
                template=template,
                body="",
                kavenegar_template_name=template.kavenegar_template_name,
                kavenegar_tokens=tokens,
                status="queued",
            )
            send_sms_task.delay(log.id)
            return log

        try:
            body = template.body.format(**context)
        except (KeyError, IndexError) as exc:
            return SmsLog.objects.create(
                phone=phone,
                template=template,
                body=template.body,
                status="failed",
                error=f"placeholder گمشده در context: {exc}",
            )

        log = SmsLog.objects.create(phone=phone, template=template, body=body, status="queued")
        send_sms_task.delay(log.id)
        return log
