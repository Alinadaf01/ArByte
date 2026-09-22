/**
 * تست یکپارچگی `transitionTo` روی دیتابیس محلی واقعی — معیار پذیرش صریح
 * الحاقیه T-004 §۱۲: «transitionTo گذار نامعتبر را رد می‌کند (تست با پرش
 * PENDING → SHIPPED)».
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { ConflictException } from "@nestjs/common";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatusService } from "./order-status.service";

const prisma = new PrismaService();
const orderStatusService = new OrderStatusService(prisma);

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedOrder() {
  const mobile = `09${String(Math.floor(100000000 + Math.random() * 899999999))}`;
  const user = await prisma.user.create({ data: { mobile } });
  const order = await prisma.order.create({
    data: {
      orderNumber: `ARB-TEST-${randomUUID()}`,
      userId: user.id,
      shippingRecipientName: "کاربر تست",
      shippingMobile: mobile,
      shippingProvince: "تهران",
      shippingCity: "تهران",
      shippingAddressLine: "خیابان تست",
      subtotal: 1_000_000n,
      finalTotal: 1_000_000n,
    },
  });
  return order;
}

describe("OrderStatusService.transitionTo", () => {
  it("گذار مجاز را اعمال می‌کند و OrderStatusHistory ثبت می‌کند", async () => {
    const order = await seedOrder();

    const updated = await orderStatusService.transitionTo(
      order.id,
      "AWAITING_PAYMENT",
      null,
      "تست",
    );
    expect(updated.status).toBe("AWAITING_PAYMENT");

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: order.id },
    });
    expect(history).toHaveLength(1);
    expect(history[0]?.fromStatus).toBe("PENDING");
    expect(history[0]?.toStatus).toBe("AWAITING_PAYMENT");
  });

  it("گذار نامعتبر PENDING → SHIPPED را رد می‌کند و Order.status را عوض نمی‌کند", async () => {
    const order = await seedOrder();

    let caughtError: unknown;
    try {
      await orderStatusService.transitionTo(order.id, "SHIPPED", null);
    } catch (error) {
      caughtError = error;
    }
    expect(caughtError).toBeInstanceOf(ConflictException);
    expect((caughtError as ConflictException).getResponse()).toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
    });

    const unchanged = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(unchanged.status).toBe("PENDING");

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: order.id },
    });
    expect(history).toHaveLength(0);
  });

  it("وضعیت‌های پایانی (DELIVERED/CANCELLED) هیچ گذار خروجی‌ای قبول نمی‌کنند", async () => {
    const order = await seedOrder();
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });

    await expect(
      orderStatusService.transitionTo(order.id, "PROCESSING", null),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
