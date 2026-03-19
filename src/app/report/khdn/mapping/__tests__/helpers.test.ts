import { describe, it, expect } from "vitest";
import {
  removeVietnameseTones,
  slugifyBusinessText,
  toInternalType,
  normalizeFieldType,
  buildInternalFieldKey,
  normalizeInputByType,
} from "../helpers";

describe("removeVietnameseTones", () => {
  it("removes diacritics from Vietnamese characters", () => {
    expect(removeVietnameseTones("Nguyễn Văn An")).toBe("Nguyen Van An");
  });
  it("converts đ → d and Đ → D", () => {
    expect(removeVietnameseTones("đường Đinh Tiên Hoàng")).toBe("duong Dinh Tien Hoang");
  });
  it("passes through plain ASCII unchanged", () => {
    expect(removeVietnameseTones("Hello World 123")).toBe("Hello World 123");
  });
  it("handles empty string", () => {
    expect(removeVietnameseTones("")).toBe("");
  });
});

describe("slugifyBusinessText", () => {
  it("converts Vietnamese text to slug", () => {
    expect(slugifyBusinessText("Ban lãnh đạo")).toBe("ban_lanh_dao");
  });
  it("collapses multiple spaces/special chars to single underscore", () => {
    expect(slugifyBusinessText("Cơ  cấu  vốn!")).toBe("co_cau_von");
  });
  it("removes leading and trailing underscores", () => {
    expect(slugifyBusinessText("  hello  ")).toBe("hello");
  });
  it("lowercases output", () => {
    expect(slugifyBusinessText("DOANH THU")).toBe("doanh_thu");
  });
  it("handles already-slug input", () => {
    expect(slugifyBusinessText("doanh_thu_2024")).toBe("doanh_thu_2024");
  });
  it("returns empty string for all-special input", () => {
    expect(slugifyBusinessText("!!!---///")).toBe("");
  });
});

describe("toInternalType", () => {
  it("maps string → text", () => expect(toInternalType("string")).toBe("text"));
  it("passes through number", () => expect(toInternalType("number")).toBe("number"));
  it("passes through percent", () => expect(toInternalType("percent")).toBe("percent"));
  it("passes through date", () => expect(toInternalType("date")).toBe("date"));
  it("passes through table", () => expect(toInternalType("table")).toBe("table"));
});

describe("normalizeFieldType", () => {
  it("maps 'string' → 'text'", () => expect(normalizeFieldType("string")).toBe("text"));
  it("maps 'text' → 'text'", () => expect(normalizeFieldType("text")).toBe("text"));
  it("passes through valid types unchanged", () => {
    expect(normalizeFieldType("number")).toBe("number");
    expect(normalizeFieldType("percent")).toBe("percent");
    expect(normalizeFieldType("date")).toBe("date");
    expect(normalizeFieldType("table")).toBe("table");
  });
  it("falls back to 'text' for unknown types", () => {
    expect(normalizeFieldType("unknown_type")).toBe("text");
    expect(normalizeFieldType(null)).toBe("text");
    expect(normalizeFieldType(undefined)).toBe("text");
    expect(normalizeFieldType(123)).toBe("text");
  });
});

describe("buildInternalFieldKey", () => {
  it("generates key from group and label", () => {
    const key = buildInternalFieldKey({
      group: "Ban lãnh đạo",
      labelVi: "Họ và tên",
      existingKeys: [],
    });
    expect(key).toBe("custom.ban_lanh_dao.ho_va_ten");
  });

  it("adds numeric suffix when base key exists", () => {
    const key = buildInternalFieldKey({
      group: "Test",
      labelVi: "Name",
      existingKeys: ["custom.test.name"],
    });
    expect(key).toBe("custom.test.name_2");
  });

  it("increments suffix until unique", () => {
    const key = buildInternalFieldKey({
      group: "Test",
      labelVi: "Name",
      existingKeys: ["custom.test.name", "custom.test.name_2", "custom.test.name_3"],
    });
    expect(key).toBe("custom.test.name_4");
  });

  it("uses fallbacks for empty group or label", () => {
    const key = buildInternalFieldKey({
      group: "",
      labelVi: "",
      existingKeys: [],
    });
    expect(key).toBe("custom.nhom.truong");
  });
});

describe("normalizeInputByType", () => {
  it("returns string as-is for text type", () => {
    expect(normalizeInputByType("hello", "text")).toBe("hello");
  });
  it("parses Vietnamese number format for number type", () => {
    // "1.234,56" → 1234.56
    expect(normalizeInputByType("1.234,56", "number")).toBe(1234.56);
  });
  it("strips percent sign for percent type", () => {
    expect(normalizeInputByType("15,5%", "percent")).toBe(15.5);
  });
  it("returns empty string for empty input on number type", () => {
    expect(normalizeInputByType("", "number")).toBe("");
  });
  it("returns original input if not parseable as number", () => {
    expect(normalizeInputByType("abc", "number")).toBe("abc");
  });
});
