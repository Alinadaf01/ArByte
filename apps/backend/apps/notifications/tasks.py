from celery import shared_task


@shared_task
def send_sms_task(sms_log_id: int) -> None:
    from .kavenegar_client import get_kavenegar_client
    from .models import SmsLog

    log = SmsLog.objects.get(pk=sms_log_id)
    try:
        client = get_kavenegar_client()
        if log.kavenegar_template_name:
            response = client.verify_lookup(
                {
                    "receptor": log.phone,
                    "token": log.kavenegar_token,
                    "template": log.kavenegar_template_name,
                    "type": "sms",
                }
            )
        else:
            response = client.sms_send({"receptor": log.phone, "message": log.body})
        log.provider_message_id = str(response[0]["messageid"]) if response else ""
        log.status = "sent"
    except Exception as exc:  # provider/network/config failures must never break order flow
        log.status = "failed"
        log.error = str(exc)
    log.save(update_fields=["status", "provider_message_id", "error"])
