import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSION_METADATA_KEY } from "./require-permission.decorator";

/**
 * بند ۱۱.۸۶ — مجوز باید سمت سرور هم چک شود، نه فقط UI. این Guard واقعی روی
 * هر route با `@RequirePermission()` سوار می‌شود و کلید مجوز لازم را از
 * متادیتا می‌خواند — معماری کامل است.
 *
 * ⚠️ `canActivate` فعلاً همیشه `true` برمی‌گرداند چون هنوز هیچ نشست/JWT
 * واقعی ادمین در apps/api پیاده نشده (RBAC واقعی، بند ۱۱.۱۷–۱۱.۲۴، تسک
 * جداگانه‌ی فاز بعد است) — دقیقاً هم‌راستا با `apps/admin/src/lib/permissions.ts`
 * (`hasPermission` هم همیشه `true`، با همین توضیح). وقتی نشست واقعی وصل شد،
 * فقط بدنه‌ی این متد عوض می‌شود؛ همه‌ی controllerها و دکوراتورهای
 * `@RequirePermission` بدون تغییر می‌مانند.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  // توکن Inject صریح — نه فقط تایپ ساده — چون esbuild (موتور اجرای tsx،
  // ر.ک. docs/api/README.md یا یادداشت SKILL درباره‌ی dev script) هنوز
  // emitDecoratorMetadata را کامل پیاده نمی‌کند؛ بدون این، Nest نمی‌داند چه
  // چیزی را باید اینجکت کند و `reflector` در runtime واقعا undefined می‌ماند.
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.get<string | undefined>(
      PERMISSION_METADATA_KEY,
      context.getHandler(),
    );
    if (!permission) return true;

    // TODO(auth): بعد از پیاده‌سازی نشست ادمین، مجوزهای actor را از
    // request.user (یا معادل) بخوان و با `permission` مقایسه کن؛ در صورت
    // نبودن، ForbiddenException با کد "FORBIDDEN" پرتاب شود (بند ۸.۹۳).
    return true;
  }
}
