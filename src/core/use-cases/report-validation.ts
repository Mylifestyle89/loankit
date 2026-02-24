import { ValidationError } from "@/core/errors/app-error";

type ValidateInput = {
  validation: unknown;
  templatePath: string;
  aliasPath: string;
  source: "pipeline" | "cached";
};

export function validateReportPayload(input: ValidateInput): unknown {
  if (!input.templatePath || !input.aliasPath) {
    throw new ValidationError("Thiếu cấu hình template hoặc alias cho kiểm tra.");
  }
  if (input.validation === null || input.validation === undefined) {
    throw new ValidationError("Dữ liệu validation rỗng.");
  }
  return input.validation;
}

