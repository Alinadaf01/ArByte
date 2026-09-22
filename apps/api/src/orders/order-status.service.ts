import {
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import {
  ERROR_MESSAGES,
  isValidOrderStatusTransition,
  type OrderStatus,
} from "@arbyte/contracts";
import { PrismaService } from "../prisma/prisma.service";

/**
 * §۸.۸۵ — صف اعلان واقعی فاز بعد است؛ این Interface جای آن را نگه می‌دارد
 * تا `transitionTo` از روز اول جای درستش را صدا بزند، بدون اینکه منطق صف
 * واقعی اینجا نوشته شود (که پیاده‌سازی endpoint/queue است، خارج از محدوده‌ی T-004).
 */
export interface OrderNotifier {
  notifyStatusChange(
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
  ): Promise<void>;
}

export const ORDER_NOTIFIER = Symbol("ORDER_NOTIFIER");

@Injectable()
export class NoopOrderNotifier implements OrderNotifier {
  async notifyStatusChange(): Promise<void> {
    // عمداً خالی — پیاده‌سازی صف واقعی در فاز بعد جایگزین می‌شود.
  }
}

/**
 * الحاقیه T-004 §۵: «Order.status هرگز مستقیم ست نشود» — این متد تنها
 * راه مجاز تغییر وضعیت سفارش است. جدول گذارهای مجاز از
 * `@arbyte/contracts` (که خودش از docs/data-model.md آمده، تصمیم T-003)
 * می‌آید، پس دو منبع حقیقت نداریم.
 */
@Injectable()
export class OrderStatusService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(ORDER_NOTIFIER)
    private readonly notifier: OrderNotifier = new NoopOrderNotifier(),
  ) {}

  async transitionTo(
    orderId: string,
    next: OrderStatus,
    actorId: string | null,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
      });

      if (!isValidOrderStatusTransition(order.status, next)) {
        // §۸.۹۳ — شکل خطا دقیقاً همان ساختار استاندارد؛ AllExceptionsFilter
        // این body را عیناً به کلاینت می‌فرستد (requestId را خودش اضافه می‌کند).
        throw new ConflictException({
          code: "INVALID_STATUS_TRANSITION",
          message: ERROR_MESSAGES.INVALID_STATUS_TRANSITION,
        });
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: next },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: next,
          changedByUserId: actorId,
          note: reason,
        },
      });

      await this.notifier.notifyStatusChange(orderId, order.status, next);

      return updated;
    });
  }
}
