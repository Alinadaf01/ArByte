import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ValidateMobileDto } from "./validate-mobile.dto";

/**
 * مسیر تستی فقط برای اثبات اینکه ValidationPipe (Zod) + فیلتر استثنای سراسری
 * دقیقاً ساختار خطای بند ۸.۹۳ برند بوک را تولید می‌کنند. جایگزین آن با یک
 * Endpoint واقعی (مثلاً OTP Request) در تسک‌های مربوط به Authentication است.
 */
@ApiTags("diagnostics")
@Controller("_diagnostics")
export class DiagnosticsController {
  @Post("validate-mobile")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "شماره موبایل معتبر است" })
  validateMobile(@Body() dto: ValidateMobileDto) {
    return { mobile: dto.mobile, valid: true };
  }
}
