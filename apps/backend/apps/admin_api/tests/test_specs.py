from django.urls import reverse
from rest_framework.test import APITestCase

from apps.catalog.models import Attribute, AttributeValue, ProductAttribute

from .base import AdminApiTestMixin


class AdminSpecsApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.product = self.make_product(stock=0)
        self.attribute = Attribute.objects.create(name="Color", slug="color", input_type="select")
        self.attribute.categories.add(self.product.category)
        self.other_attribute = Attribute.objects.create(name="Material", slug="material", input_type="text")

    def test_create_attribute_with_categories_logs_activity_without_crashing(self):
        # Regression: the activity log used to store validated_data's
        # `categories` M2M list (Category *instances*, not IDs) verbatim
        # into a JSONField, which crashed at the DB layer — see
        # AdminActivityLogMixin's _jsonable().
        response = self.client.post(
            reverse("admin-attribute-list"),
            {
                "name": "Max Load",
                "slug": "max-load",
                "unit": "kg",
                "inputType": "number",
                "categories": [self.product.category_id],
                "isRequired": False,
                "order": 0,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Attribute.objects.filter(slug="max-load").exists())

    def test_attributes_scoped_by_category(self):
        response = self.client.get(reverse("admin-attribute-list"), {"category": self.product.category_id})
        slugs = [a["slug"] for a in response.data]
        self.assertIn("color", slugs)
        self.assertNotIn("material", slugs)

    def test_promote_value_to_reusable_dropdown_entry(self):
        response = self.client.post(reverse("admin-attribute-value-list", args=[self.attribute.pk]), {"value": "Red"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(AttributeValue.objects.filter(attribute=self.attribute, value="Red").exists())

    def test_get_specs_returns_editable_shape(self):
        value = AttributeValue.objects.create(attribute=self.attribute, value="Blue")
        ProductAttribute.objects.create(product=self.product, attribute=self.attribute, value_option=value)
        ProductAttribute.objects.create(product=self.product, attribute=self.other_attribute, value_text="Plastic")

        response = self.client.get(reverse("admin-product-specs", args=[self.product.pk]))
        self.assertEqual(response.status_code, 200)
        by_attribute = {row["attribute_id"]: row for row in response.data}
        self.assertEqual(by_attribute[self.attribute.pk]["value_option_id"], value.pk)
        self.assertEqual(by_attribute[self.other_attribute.pk]["value_text"], "Plastic")

    def test_put_specs_replaces_all(self):
        value = AttributeValue.objects.create(attribute=self.attribute, value="Blue")
        # seed one existing spec that should be gone after the PUT
        ProductAttribute.objects.create(product=self.product, attribute=self.other_attribute, value_text="Plastic")

        response = self.client.put(
            reverse("admin-product-specs", args=[self.product.pk]),
            [{"attributeId": self.attribute.pk, "valueOptionId": value.pk}],
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        specs = ProductAttribute.objects.filter(product=self.product)
        self.assertEqual(specs.count(), 1)
        self.assertEqual(specs.first().attribute_id, self.attribute.pk)

    def test_put_specs_rejects_both_option_and_text(self):
        value = AttributeValue.objects.create(attribute=self.attribute, value="Blue")
        response = self.client.put(
            reverse("admin-product-specs", args=[self.product.pk]),
            [{"attributeId": self.attribute.pk, "valueOptionId": value.pk, "valueText": "Blue"}],
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_put_specs_rejects_neither_option_nor_text(self):
        response = self.client.put(
            reverse("admin-product-specs", args=[self.product.pk]),
            [{"attributeId": self.attribute.pk}],
            format="json",
        )
        self.assertEqual(response.status_code, 400)
