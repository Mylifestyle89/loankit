/**
 * Tests for DOCX section cloner — validates multi-asset cloning logic
 */
import { describe, it, expect, beforeEach } from "vitest";
import PizZip from "pizzip";
import { cloneSectionsForAssets, CATEGORY_TO_PREFIX, CATEGORY_TO_COLLATERAL_TYPE } from "../docx-section-cloner";

describe("docx-section-cloner", () => {
  describe("CATEGORY_TO_PREFIX", () => {
    it("maps land templates to SĐ prefix", () => {
      expect(CATEGORY_TO_PREFIX.ts_qsd_bv).toBe("SĐ");
      expect(CATEGORY_TO_PREFIX.ts_qsd_bt3).toBe("SĐ");
      expect(CATEGORY_TO_PREFIX.ts_glvd_bv).toBe("SĐ");
      expect(CATEGORY_TO_PREFIX.ts_glvd_bt3).toBe("SĐ");
    });

    it("maps movable templates to ĐS prefix", () => {
      expect(CATEGORY_TO_PREFIX.ts_ptgt_bv).toBe("ĐS");
      expect(CATEGORY_TO_PREFIX.ts_ptgt_bt3).toBe("ĐS");
    });
  });

  describe("CATEGORY_TO_COLLATERAL_TYPE", () => {
    it("maps land categories to qsd_dat", () => {
      expect(CATEGORY_TO_COLLATERAL_TYPE.ts_qsd_bv).toBe("qsd_dat");
      expect(CATEGORY_TO_COLLATERAL_TYPE.ts_qsd_bt3).toBe("qsd_dat");
      expect(CATEGORY_TO_COLLATERAL_TYPE.ts_glvd_bv).toBe("qsd_dat");
      expect(CATEGORY_TO_COLLATERAL_TYPE.ts_glvd_bt3).toBe("qsd_dat");
    });

    it("maps movable categories to dong_san", () => {
      expect(CATEGORY_TO_COLLATERAL_TYPE.ts_ptgt_bv).toBe("dong_san");
      expect(CATEGORY_TO_COLLATERAL_TYPE.ts_ptgt_bt3).toBe("dong_san");
    });
  });

  describe("cloneSectionsForAssets", () => {
    let zip: PizZip;

    beforeEach(() => {
      // Create mock DOCX zip with simple body content
      zip = new PizZip();
      const mockXml = `<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>[SĐ.Tên TSBĐ]</w:t></w:r></w:p>
    <w:p><w:r><w:t>[SĐ.Địa chỉ]</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;
      zip.file("word/document.xml", mockXml);
    });

    it("returns early if count <= 0", () => {
      const before = zip.file("word/document.xml")!.asText();
      cloneSectionsForAssets(zip, "SĐ", 0);
      const after = zip.file("word/document.xml")!.asText();
      expect(after).toBe(before);
    });

    it("returns early if document.xml missing", () => {
      const emptyZip = new PizZip();
      expect(() => cloneSectionsForAssets(emptyZip, "SĐ", 2)).not.toThrow();
    });

    it("modifies document content when count > 1", () => {
      const beforeText = zip.file("word/document.xml")!.asText();
      cloneSectionsForAssets(zip, "SĐ", 2);
      const afterText = zip.file("word/document.xml")!.asText();

      // Content should be modified (cloned)
      expect(afterText).not.toBe(beforeText);
      // Should contain indexed references
      expect(afterText).toContain("_1");
      expect(afterText).toContain("_2");
    });

    it("handles count=1 by rewriting SĐ. to SĐ_1.", () => {
      cloneSectionsForAssets(zip, "SĐ", 1);
      const result = zip.file("word/document.xml")!.asText();

      // Should rewrite prefix to indexed form
      expect(result).toContain("_1");
    });

    it("handles owner field prefix (ĐSH) separately", () => {
      const ownerZip = new PizZip();
      const ownerXml = `<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>[SĐ.Tên TSBĐ]</w:t></w:r></w:p>
    <w:p><w:r><w:t>[ĐSH.Tên chủ sở hữu]</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;
      ownerZip.file("word/document.xml", ownerXml);

      cloneSectionsForAssets(ownerZip, "SĐ", 2);
      const result = ownerZip.file("word/document.xml")!.asText();

      // Both prefixes should be indexed
      expect(result).toContain("SĐ_1");
      expect(result).toContain("SĐ_2");
      expect(result).toContain("ĐSH_1");
      expect(result).toContain("ĐSH_2");
    });
  });
});
