import fs from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

function unflatten(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in data) {
    const value = data[key];
    const parts = key.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      // If the next part is a number, create an array, otherwise an object
      const nextPart = parts[i + 1];
      const isNextArray = !isNaN(Number(nextPart));
      if (!(part in current)) {
        current[part] = isNextArray ? [] : {};
      }
      current = current[part] as any;
    }
    const lastPart = parts[parts.length - 1];
    if (Array.isArray(current)) {
      current[Number(lastPart)] = value;
    } else {
      current[lastPart] = value;
    }
  }
  return result;
}

export async function runExportNative(params: {
  templatePath: string;
  aliasPath: string;
  flatJsonPath: string;
  outputPath: string;
  reportPath: string;
}): Promise<{ exportReport: unknown }> {
  // Read inputs
  const templateAbs = path.join(process.cwd(), params.templatePath);
  const aliasAbs = path.join(process.cwd(), params.aliasPath);
  const flatJsonAbs = path.join(process.cwd(), params.flatJsonPath);

  const templateContent = await fs.readFile(templateAbs);
  const flatJson = JSON.parse(await fs.readFile(flatJsonAbs, "utf-8"));
  
  let aliasMap: Record<string, any> = {};
  try {
    aliasMap = JSON.parse(await fs.readFile(aliasAbs, "utf-8"));
  } catch (e) {
    // Alias map might not exist or be empty, that's fine
  }

  // Pre-process alias map logic natively
  // For each key in alias map, if it resolves to something, put it in flatJson
  for (const [field, spec] of Object.entries(aliasMap)) {
    if (field in flatJson) continue; // Already exists

    let value = undefined;
    if (typeof spec === "string") {
      value = flatJson[spec];
    } else if (Array.isArray(spec)) {
      for (const candidate of spec) {
        if (typeof candidate === "string" && candidate in flatJson) {
          value = flatJson[candidate];
          break;
        }
      }
    } else if (spec && typeof spec === "object") {
      if ("literal" in spec) {
        const lit = spec.literal;
        if (lit === "$TODAY_DDMMYYYY") value = new Date().toLocaleDateString("vi-VN");
        else if (lit === "$TODAY_DD") value = new Date().getDate().toString().padStart(2, "0");
        else if (lit === "$TODAY_MM") value = (new Date().getMonth() + 1).toString().padStart(2, "0");
        else if (lit === "$TODAY_YYYY") value = new Date().getFullYear().toString();
        else value = lit;
      } else if ("from" in spec) {
        const src = spec.from;
        if (typeof src === "string") value = flatJson[src];
        else if (Array.isArray(src)) {
          for (const candidate of src) {
            if (typeof candidate === "string" && candidate in flatJson) {
              value = flatJson[candidate];
              break;
            }
          }
        }
      }
    }

    if (value !== undefined) {
      flatJson[field] = value;
    }
  }

  // Number formatting logic to match old python behavior if needed?
  // Docxtemplater just outputs values as strings, so let's format numbers in flatJson first.
  for (const key in flatJson) {
    const val = flatJson[key];
    if (typeof val === "number") {
      // Basic VN formatting
      let s = val.toLocaleString("en-US", { maximumFractionDigits: 6 });
      s = s.replace(/,/g, "_").replace(/\./g, ",").replace(/_/g, ".");
      flatJson[key] = s;
    }
  }

  // Unflatten to support deep properties and docxtemplater arrays!
  const nestedData = unflatten(flatJson);

  // Run docxtemplater
  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "[", end: "]" },
  });

  doc.render(nestedData);

  const buf = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const outputAbs = path.join(process.cwd(), params.outputPath);
  await fs.mkdir(path.dirname(outputAbs), { recursive: true });
  await fs.writeFile(outputAbs, buf);

  const report = {
    template_docx: params.templatePath,
    output_docx: params.outputPath,
    engine: "docxtemplater (native)",
  };

  const reportAbs = path.join(process.cwd(), params.reportPath);
  await fs.mkdir(path.dirname(reportAbs), { recursive: true });
  await fs.writeFile(reportAbs, JSON.stringify(report, null, 2), "utf-8");

  return { exportReport: report };
}
