"""D-03 §3 — ports packages/contracts/src/catalog/variant-label.ts and
variant-selection.ts line-for-line. Server builds the label, never the
frontend (see those files' own comments) — this is the server now."""


def build_variant_label(axis_values: dict[str, str], variant_axes: list[dict]) -> str:
    """variant_axes: ordered list of {"specDefId": ...} (order comes from the
    product's variantAxes, not dict iteration order)."""
    parts = [axis_values.get(axis["specDefId"]) for axis in variant_axes]
    return " · ".join(p for p in parts if p)


def select_card_variant(variants: list[dict], default_variant_id: str, spec_filters: dict[str, str] | None = None) -> dict:
    """variants: list of dicts each with at least "id" and "axisValues".
    Raises ValueError if variants is empty (every product has >= 1 variant,
    per T-003 addendum §1 — a genuine invariant violation, not user input)."""
    if not variants:
        raise ValueError("select_card_variant: هر محصول حداقل یک واریانت دارد.")
    first_variant = variants[0]

    if spec_filters:
        for variant in variants:
            axis_values = variant["axisValues"]
            if all(axis_values.get(spec_def_id) == value for spec_def_id, value in spec_filters.items()):
                return variant

    return next((v for v in variants if v["id"] == default_variant_id), first_variant)
