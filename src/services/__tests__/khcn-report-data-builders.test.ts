/**
 * Tests for KHCN report data builders — validates indexed field emission
 */
import { describe, it, expect } from "vitest";
import {
  buildLandCollateralData,
  buildMovableCollateralData,
  buildSavingsCollateralData,
  buildOtherCollateralData,
  getCollateralCount,
} from "../khcn-report-data-builders";

describe("khcn-report-data-builders", () => {
  describe("getCollateralCount", () => {
    it("counts collaterals by type", () => {
      const collaterals = [
        { collateral_type: "qsd_dat" },
        { collateral_type: "qsd_dat" },
        { collateral_type: "dong_san" },
      ];
      expect(getCollateralCount(collaterals, "qsd_dat")).toBe(2);
      expect(getCollateralCount(collaterals, "dong_san")).toBe(1);
    });

    it("returns 0 when no matching collaterals", () => {
      const collaterals = [{ collateral_type: "qsd_dat" }];
      expect(getCollateralCount(collaterals, "dong_san")).toBe(0);
    });

    it("returns 0 for empty array", () => {
      expect(getCollateralCount([], "qsd_dat")).toBe(0);
    });
  });

  describe("buildLandCollateralData", () => {
    it("emits indexed SĐ_1.*, SĐ_2.* fields for multiple lands", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "qsd_dat",
          name: "Land 1",
          total_value: 1000000,
          obligation: 500000,
          properties_json: JSON.stringify({ land_address: "Address 1" }),
        },
        {
          collateral_type: "qsd_dat",
          name: "Land 2",
          total_value: 2000000,
          obligation: 1000000,
          properties_json: JSON.stringify({ land_address: "Address 2" }),
        },
      ];

      buildLandCollateralData(collaterals, data);

      // Check indexed fields
      expect(data["SĐ_1.STT"]).toBe(1);
      expect(data["SĐ_1.Tên TSBĐ"]).toBe("Land 1");
      expect(data["SĐ_2.STT"]).toBe(2);
      expect(data["SĐ_2.Tên TSBĐ"]).toBe("Land 2");

      // Check backward compatibility flat fields
      expect(data["SĐ.Tên TSBĐ"]).toBe("Land 1");

      // Check loop array
      expect(Array.isArray(data["TSBD_CHI_TIET"])).toBe(true);
      expect((data["TSBD_CHI_TIET"] as unknown[]).length).toBe(2);
    });

    it("emits correct field keys for land properties", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "qsd_dat",
          name: "Land 1",
          total_value: 1000000,
          obligation: 500000,
          properties_json: JSON.stringify({
            _owners: [{ name: "John Doe" }],
            land_address: "Address 1",
          }),
        },
      ];

      buildLandCollateralData(collaterals, data);

      // Should have indexed land fields
      const indexedKeys = Object.keys(data).filter((k) => k.startsWith("SĐ_1."));
      expect(indexedKeys.length).toBeGreaterThan(0);
      expect(indexedKeys).toContain("SĐ_1.Tên TSBĐ");
      expect(indexedKeys).toContain("SĐ_1.Địa chỉ đất");
    });

    it("includes valuation table with all collaterals", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "qsd_dat",
          name: "Land 1",
          total_value: 1000000,
          obligation: 500000,
          properties_json: JSON.stringify({ land_area: "100m2", land_type_1: "Đất ở" }),
        },
      ];

      buildLandCollateralData(collaterals, data);

      const table = data["TSBD_DINH_GIA"] as unknown[];
      expect(Array.isArray(table)).toBe(true);
      expect(table[0]).toHaveProperty("Tên TSBĐ", "Land 1");
      expect(table[0]).toHaveProperty("Tổng giá trị TS", "1.000.000");
    });

    it("skips non-matching collateral types", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "dong_san", // Not land
          name: "Vehicle",
          properties_json: "{}",
        },
      ];

      buildLandCollateralData(collaterals, data);

      // Should not emit any SĐ fields
      expect(data["SĐ.Tên TSBĐ"]).toBeUndefined();
      expect((data["TSBD_CHI_TIET"] as unknown[]).length).toBe(0);
    });
  });

  describe("buildMovableCollateralData", () => {
    it("emits indexed ĐS_1.*, ĐS_2.* fields for multiple vehicles", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "dong_san",
          name: "Car 1",
          total_value: 500000,
          obligation: 250000,
          properties_json: JSON.stringify({ license_plate: "ABC123" }),
        },
        {
          collateral_type: "dong_san",
          name: "Car 2",
          total_value: 600000,
          obligation: 300000,
          properties_json: JSON.stringify({ license_plate: "XYZ789" }),
        },
      ];

      buildMovableCollateralData(collaterals, data);

      // Check indexed fields
      expect(data["ĐS_1.STT"]).toBe(1);
      expect(data["ĐS_1.Tên TSBĐ"]).toBe("Car 1");
      expect(data["ĐS_2.STT"]).toBe(2);
      expect(data["ĐS_2.Tên TSBĐ"]).toBe("Car 2");

      // Check backward compatibility
      expect(data["ĐS.Tên TSBĐ"]).toBe("Car 1");
    });

    it("includes detail loop array for [#DS_CHI_TIET]", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "dong_san",
          name: "Car 1",
          properties_json: JSON.stringify({ license_plate: "ABC123" }),
        },
      ];

      buildMovableCollateralData(collaterals, data);

      expect(Array.isArray(data["DS_CHI_TIET"])).toBe(true);
    });

    it("skips non-movable collateral types", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "qsd_dat", // Not movable
          name: "Land",
          properties_json: "{}",
        },
      ];

      buildMovableCollateralData(collaterals, data);

      expect(data["ĐS.Tên TSBĐ"]).toBeUndefined();
    });
  });

  describe("buildSavingsCollateralData", () => {
    it("emits indexed TK_1.*, TK_2.* fields", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "tiet_kiem",
          name: "Savings 1",
          properties_json: JSON.stringify({}),
        },
      ];

      buildSavingsCollateralData(collaterals, data);

      expect(data["TK_1.Tên TSBĐ"]).toBe("Savings 1");
      expect(data["TK.Tên TSBĐ"]).toBe("Savings 1"); // backward compat
    });

    it("skips non-savings collateral types", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "qsd_dat",
          name: "Land",
          properties_json: "{}",
        },
      ];

      buildSavingsCollateralData(collaterals, data);

      expect(data["TK.Tên TSBĐ"]).toBeUndefined();
    });
  });

  describe("buildOtherCollateralData", () => {
    it("emits indexed TSK_1.*, TSK_2.* fields", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "tai_san_khac",
          name: "Other Asset 1",
          properties_json: JSON.stringify({}),
        },
      ];

      buildOtherCollateralData(collaterals, data);

      expect(data["TSK_1.Tên TSBĐ"]).toBe("Other Asset 1");
      expect(data["TSK.Tên TSBĐ"]).toBe("Other Asset 1"); // backward compat
    });

    it("skips non-matching collateral types", () => {
      const data: Record<string, unknown> = {};
      const collaterals = [
        {
          collateral_type: "qsd_dat",
          name: "Land",
          properties_json: "{}",
        },
      ];

      buildOtherCollateralData(collaterals, data);

      expect(data["TSK.Tên TSBĐ"]).toBeUndefined();
    });
  });
});
