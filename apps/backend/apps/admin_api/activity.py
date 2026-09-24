from apps.analytics.models import AdminActivityLog


def log_admin_action(*, user, action: str, model_name: str, object_id, changes: dict | None = None) -> None:
    AdminActivityLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        model_name=model_name,
        object_id=str(object_id),
        changes=changes,
    )


class AdminActivityLogMixin:
    """Drop into any generic APIView/ModelViewSet-style admin view to get
    automatic AdminActivityLog rows on create/update/destroy — the contract
    (bonus §"Admin activity log") requires this to be automatic, never a
    separate call the view author has to remember.

    `activity_log_exclude_fields` lets a view (e.g. ApiCredential's) keep a
    secret field out of the logged diff entirely — the activity log is a
    readable admin API response, so anything excluded from ordinary
    serializer output (see §0(د)) must be excluded here too, not just
    masked by coincidence."""

    activity_log_exclude_fields: set[str] = set()

    def _loggable_fields(self, validated_data: dict) -> dict:
        return {k: v for k, v in validated_data.items() if k not in self.activity_log_exclude_fields}

    def perform_create(self, serializer):
        super().perform_create(serializer)
        log_admin_action(
            user=self.request.user,
            action="create",
            model_name=serializer.instance.__class__.__name__,
            object_id=serializer.instance.pk,
            changes={field: [None, _jsonable(value)] for field, value in self._loggable_fields(serializer.validated_data).items()},
        )

    def perform_update(self, serializer):
        loggable = self._loggable_fields(serializer.validated_data)
        before = {field: getattr(serializer.instance, field, None) for field in loggable}
        super().perform_update(serializer)
        changes = {
            field: [_jsonable(before[field]), _jsonable(getattr(serializer.instance, field, None))]
            for field in loggable
        }
        log_admin_action(
            user=self.request.user,
            action="update",
            model_name=serializer.instance.__class__.__name__,
            object_id=serializer.instance.pk,
            changes=changes,
        )

    def perform_destroy(self, instance):
        model_name = instance.__class__.__name__
        object_id = instance.pk
        super().perform_destroy(instance)
        log_admin_action(user=self.request.user, action="delete", model_name=model_name, object_id=object_id)


def _jsonable(value):
    """AdminActivityLog.changes is a plain JSONField — model instances,
    Decimals, etc. from validated_data/instance attrs need to survive
    json.dumps, so this only keeps the printable form (repr for anything
    non-primitive) rather than risk a save-time TypeError.

    Recurses into list/dict: an M2M field like Attribute.categories arrives
    in validated_data as a *list of Category instances*, not a list of
    primitives — returning such a list unchanged (as the old `isinstance`
    check did) stores raw model objects in the JSONField and blows up at
    the psycopg2 layer, not at validation time, so it's easy to miss in
    review.
    """
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, list):
        return [_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    return str(value)
