import io

from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase

from apps.content.models import BlogPost, ContactMessage, Coupon, ProductReview

from .base import AdminApiTestMixin


def _fake_image_file(name="cover.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (10, 10), color="blue").save(buffer, format="PNG")
    buffer.seek(0)
    buffer.name = name
    return buffer


class AdminMessageApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.message = ContactMessage.objects.create(name="Sara", email="s@example.com", subject="سوال", message="پیام تستی طولانی")

    def test_list_filter_by_is_read(self):
        response = self.client.get(reverse("admin-message-list"), {"isRead": "false"})
        self.assertEqual(response.data["count"], 1)

    def test_patch_marks_read_and_note(self):
        response = self.client.patch(
            reverse("admin-message-detail", args=[self.message.pk]), {"isRead": True, "adminNote": "پاسخ داده شد"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.message.refresh_from_db()
        self.assertTrue(self.message.is_read)


class AdminReviewApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())
        self.product = self.make_product(stock=0)
        self.review = ProductReview.objects.create(product=self.product, rating=5, status="pending")

    def test_list_filter_by_status(self):
        response = self.client.get(reverse("admin-review-list"), {"status": "pending"})
        self.assertEqual(response.data["count"], 1)

    def test_approve_review(self):
        response = self.client.patch(reverse("admin-review-detail", args=[self.review.pk]), {"status": "approved"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.review.refresh_from_db()
        self.assertEqual(self.review.status, "approved")

    def test_rating_and_body_are_not_editable(self):
        response = self.client.patch(reverse("admin-review-detail", args=[self.review.pk]), {"rating": 1}, format="json")
        self.assertEqual(response.status_code, 200)
        self.review.refresh_from_db()
        self.assertEqual(self.review.rating, 5)  # unchanged, read_only field


class AdminBlogApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_create_and_publish(self):
        response = self.client.post(
            reverse("admin-blog-list"),
            {"slug": "post-1", "title": "پست اول", "excerpt": "خلاصه", "category": "محصول", "author": "تیم آربایت", "isPublished": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(BlogPost.objects.get(slug="post-1").is_published)

    def test_cover_image_upload_is_writable(self):
        # Regression: cover_image used to be a SerializerMethodField (read-only),
        # so no admin request could ever set the actual uploaded image.
        response = self.client.post(
            reverse("admin-blog-list"),
            {
                "slug": "post-with-cover", "title": "پست با کاور", "excerpt": "خلاصه",
                "category": "محصول", "author": "تیم آربایت", "coverImage": _fake_image_file(),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        post = BlogPost.objects.get(slug="post-with-cover")
        self.assertTrue(post.cover_image)

    def test_publishing_without_a_date_sets_published_at_to_now(self):
        # Regression: the panel only exposes an is_published switch, no date
        # picker — leaving published_at null crashed the storefront's blog
        # post page (Jalali date conversion throws on a null date) the
        # moment anyone visited it (BLOG-SEED-TASK.md §5 verification).
        response = self.client.post(
            reverse("admin-blog-list"),
            {"slug": "post-no-date", "title": "پست بدون تاریخ", "excerpt": "خلاصه", "category": "محصول", "author": "تیم آربایت", "isPublished": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        post = BlogPost.objects.get(slug="post-no-date")
        self.assertIsNotNone(post.published_at)

    def test_unpublished_post_still_has_no_default_date(self):
        response = self.client.post(
            reverse("admin-blog-list"),
            {"slug": "post-draft", "title": "پیش‌نویس", "excerpt": "خلاصه", "category": "محصول", "author": "تیم آربایت", "isPublished": False},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        post = BlogPost.objects.get(slug="post-draft")
        self.assertIsNone(post.published_at)

    def test_resolved_cover_url_falls_back_to_external(self):
        post = BlogPost.objects.create(
            slug="post-external", title="پست خارجی", excerpt="خلاصه", category="محصول",
            author="تیم آربایت", external_cover_url="/images/fallback.jpg",
        )
        response = self.client.get(reverse("admin-blog-detail", args=[post.pk]))
        self.assertEqual(response.status_code, 200)
        # response.data is the pre-render serializer output (snake_case);
        # the camelCase conversion only happens in the renderer, over the wire.
        self.assertEqual(response.data["resolved_cover_url"], "/images/fallback.jpg")
        self.assertIsNone(response.data["cover_image"])


class AdminCouponApiTests(AdminApiTestMixin, APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=self.make_staff())

    def test_create_coupon(self):
        response = self.client.post(
            reverse("admin-coupon-list"),
            {"code": "SAVE10", "type": "PERCENT", "percentBasisPoints": 1000},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Coupon.objects.filter(code="SAVE10").exists())

    def test_used_count_is_read_only(self):
        from apps.orders.models import CouponUsage, Order

        coupon = Coupon.objects.create(code="FIXED20", type="AMOUNT", amount_toman=20000)
        customer = self.make_customer()
        order = Order.objects.create(
            user=customer, shipping_recipient_name="", shipping_mobile="", shipping_province="",
            shipping_city="", shipping_address_line="", subtotal=100000, final_total=80000,
        )
        CouponUsage.objects.create(coupon=coupon, user=customer, order=order, discount_amount=20000)

        response = self.client.patch(reverse("admin-coupon-detail", args=[coupon.pk]), {"usedCount": 999}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["used_count"], 1)  # از CouponUsage واقعی، نه بدنه‌ی درخواست
