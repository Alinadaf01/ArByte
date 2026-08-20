import { z } from "zod";
import { createZodDto } from "../common/zod/create-zod-dto";

const schema = z.object({
  mobile: z.string().regex(/^09\d{9}$/, "شماره موبایل واردشده صحیح نیست."),
});

export class ValidateMobileDto extends createZodDto(schema) {}
