import { describe, expect, it } from "vitest";
import {
  calculateCoverageBreakdown,
  validateCoverageInputs,
} from "./claimsService.js";

describe("claimsService", () => {
  it("covers 100% for RSSB Mutuelle category 1", () => {
    const breakdown = calculateCoverageBreakdown({
      unitPriceRWF: 2000,
      quantity: 1,
      coveragePercentage: 100,
    });

    expect(breakdown).toEqual({
      totalPriceRWF: 2000,
      coveredRWF: 2000,
      patientPaysRWF: 0,
    });
  });

  it("calculates the 85% co-pay precisely for category 3", () => {
    const breakdown = calculateCoverageBreakdown({
      unitPriceRWF: 5000,
      quantity: 2,
      coveragePercentage: 85,
    });

    expect(breakdown).toEqual({
      totalPriceRWF: 10000,
      coveredRWF: 8500,
      patientPaysRWF: 1500,
    });
  });

  it("rounds RWF values to the nearest whole franc", () => {
    const breakdown = calculateCoverageBreakdown({
      unitPriceRWF: 1333.33,
      quantity: 1,
      coveragePercentage: 100,
    });

    expect(breakdown.totalPriceRWF).toBe(1333);
    expect(breakdown.coveredRWF).toBe(1333);
    expect(breakdown.patientPaysRWF).toBe(0);
  });

  it("rejects zero or negative quantities", () => {
    expect(
      validateCoverageInputs({
        medicineId: "medicine-id",
        insuranceProviderId: "provider-id",
        quantity: 0,
      })
    ).toBe("Quantity must be a whole number greater than or equal to 1.");

    expect(
      validateCoverageInputs({
        medicineId: "medicine-id",
        insuranceProviderId: "provider-id",
        quantity: -10,
      })
    ).toBe("Quantity must be a whole number greater than or equal to 1.");
  });
});
