import { Buffer } from "node:buffer";

import DocxMerger from "docx-merger";

import { ValidationError } from "@/core/errors/app-error";

type MergeDocxOptions = {
  pageBreak?: boolean;
};

export async function mergeDocxBuffers(
  buffers: Buffer[],
  options?: MergeDocxOptions,
): Promise<Buffer> {
  if (!Array.isArray(buffers) || buffers.length < 2) {
    throw new ValidationError("Cần chọn ít nhất 2 file DOCX để nối.");
  }

  for (const item of buffers) {
    if (!Buffer.isBuffer(item) || item.byteLength < 100) {
      throw new ValidationError("Một hoặc nhiều file DOCX không hợp lệ.");
    }
  }

  const merger = new DocxMerger(
    {
      pageBreak: options?.pageBreak ?? true,
    },
    buffers,
  );

  return await new Promise<Buffer>((resolve, reject) => {
    merger.save("nodebuffer", (data: Buffer | null) => {
      if (!data) {
        reject(new Error("Không thể nối DOCX."));
        return;
      }
      resolve(data);
    });
  });
}
