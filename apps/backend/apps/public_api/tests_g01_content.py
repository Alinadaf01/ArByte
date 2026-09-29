"""G-01 — API عمومی محتوا: وبلاگ، درباره ما، قوانین، فرم تماس و نظرات خریداران."""

from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.content.models import AboutPage, BlogPost, ContactMessage, LegalDocument, ProductReview
from apps.orders.models import Order, OrderItem
from apps.public_api.jwt_tokens import issue_tokens
from apps.users.models import User


def _post(slug, *, category="بررسی", published=True, days_ago=0, **kw):
    return BlogPost.objects.create(
        slug=slug,
        title=kw.pop("title", f"عنوان {slug}"),
        excerpt="خلاصه",
        category=category,
        author="تیم آربایت",
        is_published=published,
        published_at=timezone.now() - timedelta(days=days_ago) if published else None,
        **kw,
    )


class BlogApiTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_list_filters_search_and_hides_drafts(self):
        _post("a", category="بررسی", days_ago=2)
        _post("b", category="راهنمای خرید", days_ago=1, title="چطور لپ‌تاپ بخریم")
        _post("draft", published=False)
        body = self.client.get("/api/v1/blog").json()
        self.assertEqual([p["slug"] for p in body["data"]], ["b", "a"])
        self.assertEqual(body["meta"]["pagination"]["total"], 2)
        self.assertEqual(
            [p["slug"] for p in self.client.get("/api/v1/blog", {"category": "بررسی"}).json()["data"]], ["a"]
        )
        self.assertEqual([p["slug"] for p in self.client.get("/api/v1/blog", {"q": "لپ‌تاپ"}).json()["data"]], ["b"])
        self.assertEqual(self.client.get("/api/v1/blog", {"category": "نامعتبر"}).status_code, 400)
        cats = {c["name"]: c["count"] for c in self.client.get("/api/v1/blog/categories").json()["data"]}
        self.assertEqual((cats["بررسی"], cats["گیمینگ"]), (1, 0))

    def test_detail_sanitizes_body_and_404s_drafts(self):
        _post(
            "x",
            sections=[
                {"id": "s1", "heading": "بخش", "body": "پاراگراف <script>alert(1)</script>\n\n> نقل‌قول"},
                {
                    "heading": "html",
                    "body": '<p onclick="x()">متن <a href="javascript:alert(1)">لینک</a></p><img src="https://x/y.webp" alt="ع" onerror="z">',
                },
            ],
        )
        _post("y")
        _post("hidden", published=False)
        data = self.client.get("/api/v1/blog/x").json()["data"]
        first, second = data["sections"]
        self.assertNotIn("<script", first["html"])
        self.assertIn("<blockquote>", first["html"])
        self.assertEqual(second["id"], "s-2")
        self.assertNotIn("onclick", second["html"])
        self.assertNotIn("javascript:", second["html"])
        self.assertNotIn("onerror", second["html"])
        self.assertEqual([r["slug"] for r in data["related"]], ["y"])
        self.assertEqual(self.client.get("/api/v1/blog/hidden").status_code, 404)


class PagesApiTests(APITestCase):
    def test_about_is_empty_by_default_and_skips_blank_rows(self):
        data = self.client.get("/api/v1/content/about").json()["data"]
        self.assertEqual(data["hero"], {"title": "", "body": ""})
        self.assertEqual(data["team"]["members"], [])
        about = AboutPage.load()
        about.story_body = "یک\n\nدو"
        about.team = [{"name": "نیما", "role": "فنی"}, {"name": "", "role": "بی‌نام"}]
        about.save()
        data = self.client.get("/api/v1/content/about").json()["data"]
        self.assertEqual(data["story"]["paragraphs"], ["یک", "دو"])
        self.assertEqual(data["team"]["members"], [{"name": "نیما", "role": "فنی"}])

    def test_legal_lists_only_non_empty_documents(self):
        LegalDocument.objects.create(key="terms", body="مقدمه\n\n## بند یک\nمتن بند\n\nادامه")
        LegalDocument.objects.create(key="privacy", body="   ")
        docs = self.client.get("/api/v1/content/legal").json()["data"]
        self.assertEqual([d["key"] for d in docs], ["terms"])
        self.assertEqual(docs[0]["title"], "شرایط استفاده")
        self.assertEqual(
            docs[0]["blocks"],
            [{"heading": "", "paragraphs": ["مقدمه"]}, {"heading": "بند یک", "paragraphs": ["متن بند", "ادامه"]}],
        )


class ContactApiTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_valid_request_lands_in_admin_messages(self):
        res = self.client.post(
            "/api/v1/contact",
            {
                "name": "سارا",
                "phone": "09121234567",
                "topic": "سفارش و ارسال",
                "orderNumber": "ARB-1",
                "message": "سفارشم هنوز نرسیده است.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        msg = ContactMessage.objects.get()
        self.assertEqual((msg.subject, msg.order_number, msg.is_read), ("سفارش و ارسال", "ARB-1", False))
        self.assertEqual(res.json()["data"]["trackingCode"], msg.tracking_code)

    def test_validation_errors(self):
        res = self.client.post(
            "/api/v1/contact", {"name": "", "phone": "123", "topic": "x", "message": "کوتاه"}, format="json"
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(set(res.json()["fieldErrors"]), {"name", "phone", "topic", "message"})
        self.assertFalse(ContactMessage.objects.exists())


class ReviewApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        brand = Brand.objects.create(name="B", slug="b-g01")
        category = Category.objects.create(slug="c-g01", name="C")
        self.product = Product.objects.create(slug="p-g01", name="P", brand=brand, category=category, condition="NEW")
        variant = ProductVariant.objects.create(
            product=self.product, sku="G01-1", is_default=True, final_price=1_000_000
        )
        self.buyer = User.objects.create_user(phone="09120001111", is_verified=True, first_name="مریم")
        order = Order.objects.create(
            user=self.buyer,
            shipping_recipient_name="",
            shipping_mobile="",
            shipping_province="",
            shipping_city="",
            shipping_address_line="",
            subtotal=1_000_000,
            final_total=1_000_000,
            status="DELIVERED",
        )
        OrderItem.objects.create(
            order=order,
            variant=variant,
            product_name_snapshot="P",
            sku_snapshot="G01-1",
            unit_price=1_000_000,
            quantity=1,
            final_price=1_000_000,
        )
        self.url = f"/api/v1/catalog/products/{self.product.slug}/reviews"

    def _as(self, user):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {issue_tokens(user)[0]}")
        return client

    def test_only_delivered_buyers_can_review_once(self):
        stranger = User.objects.create_user(phone="09120002222", is_verified=True)
        self.assertEqual(
            self._as(stranger).post(self.url, {"rating": 5, "body": "عالی بود واقعاً"}, format="json").status_code, 403
        )
        self.assertEqual(
            self.client.post(self.url, {"rating": 5, "body": "عالی بود واقعاً"}, format="json").status_code, 401
        )
        buyer = self._as(self.buyer)
        self.assertTrue(buyer.get(self.url).json()["meta"]["viewer"]["canReview"])
        res = buyer.post(self.url, {"rating": 4, "body": "خوب است ولی باتری ضعیف"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["data"]["status"], "pending")
        self.assertTrue(ProductReview.objects.get().verified_purchase)
        self.assertEqual(buyer.post(self.url, {"rating": 3, "body": "دوباره می‌نویسم"}, format="json").status_code, 409)
        self.assertEqual(buyer.get(self.url).json()["meta"]["viewer"], {"canReview": False, "hasReviewed": True})

    def test_lists_only_approved_with_rating_summary(self):
        for i, (rating, status) in enumerate([(5, "approved"), (4, "approved"), (1, "pending")]):
            user = User.objects.create_user(phone=f"0912000300{i}", is_verified=True)
            ProductReview.objects.create(product=self.product, user=user, rating=rating, body="متن", status=status)
        body = self.client.get(self.url).json()
        self.assertEqual(len(body["data"]), 2)
        self.assertEqual(body["meta"]["rating"], {"average": 4.5, "count": 2})
        self.assertEqual(body["meta"]["viewer"]["canReview"], False)
