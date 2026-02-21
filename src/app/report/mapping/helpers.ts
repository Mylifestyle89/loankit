import type { FieldCatalogItem } from "@/lib/report/config-schema";

export function removeVietnameseTones(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
}

export function slugifyBusinessText(text: string): string {
    return removeVietnameseTones(text)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .replace(/__+/g, "_");
}

export function toInternalType(type: "string" | "number" | "percent" | "date" | "table"): FieldCatalogItem["type"] {
    if (type === "string") {
        return "text";
    }
    return type;
}

export function normalizeFieldType(type: unknown): FieldCatalogItem["type"] {
    if (type === "string" || type === "text") {
        return "text";
    }
    if (type === "number" || type === "percent" || type === "date" || type === "table") {
        return type;
    }
    return "text";
}

export function normalizeFieldCatalogForSchema(catalog: FieldCatalogItem[]): FieldCatalogItem[] {
    return catalog.map((item) => ({
        ...item,
        type: normalizeFieldType((item as { type?: unknown }).type),
    }));
}

export function toBusinessType(type: FieldCatalogItem["type"]): "string" | "number" | "percent" | "date" | "table" {
    if (type === "text") {
        return "string";
    }
    return type;
}

export function typeLabelKey(type: "string" | "number" | "percent" | "date" | "table"): string {
    return `mapping.typeLabel.${type}`;
}

export function buildInternalFieldKey(params: {
    group: string;
    labelVi: string;
    existingKeys: string[];
}): string {
    const groupSlug = slugifyBusinessText(params.group) || "nhom";
    const fieldSlug = slugifyBusinessText(params.labelVi) || "truong";
    const base = `custom.${groupSlug}.${fieldSlug}`;
    if (!params.existingKeys.includes(base)) {
        return base;
    }
    let i = 2;
    while (params.existingKeys.includes(`${base}_${i}`)) {
        i += 1;
    }
    return `${base}_${i}`;
}

export function normalizeInputByType(input: string, type: FieldCatalogItem["type"]): string | number {
    if (type !== "number" && type !== "percent") {
        return input;
    }
    const cleaned = input.replaceAll("%", "").replaceAll(".", "").replaceAll(",", ".").trim();
    if (cleaned === "") {
        return "";
    }
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? input : parsed;
}

export function parseNumericLikeValue(raw: unknown): number | null {
    if (raw === null || raw === undefined) {
        return null;
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw;
    }
    if (typeof raw !== "string") {
        return null;
    }
    const cleaned = raw.replaceAll(".", "").replaceAll(",", ".").trim();
    if (cleaned === "") {
        return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumberVnDisplay(raw: unknown): string {
    const parsed = parseNumericLikeValue(raw);
    if (parsed === null) {
        return raw === null || raw === undefined ? "" : String(raw);
    }
    const isInteger = Number.isInteger(parsed);
    return parsed.toLocaleString("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: isInteger ? 0 : 6,
    });
}

export function formatPercentVnDisplay(raw: unknown): string {
    const parsed = parseNumericLikeValue(raw);
    if (parsed === null) {
        return raw === null || raw === undefined ? "" : String(raw);
    }
    const fixed = Number(parsed.toFixed(2));
    return `${fixed.toLocaleString("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}%`;
}

export function toDateInputValue(raw: unknown): string {
    if (raw === null || raw === undefined) {
        return "";
    }
    const text = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }
    const parts = text.split("/");
    if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        if (yyyy && mm && dd) {
            return `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        }
    }
    return "";
}

export type TypeLabelMap = Record<"string" | "number" | "percent" | "date" | "table", string>;
