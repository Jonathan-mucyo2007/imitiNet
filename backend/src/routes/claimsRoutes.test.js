import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const medicineVariantModel = {
  findById: vi.fn(),
};

const medicineGroupModel = {
  findById: vi.fn(),
};

const insuranceProviderModel = {
  findById: vi.fn(),
  find: vi.fn(),
};

const userModel = {
  findById: vi.fn(),
};

vi.mock("../models/MedicineVariant.js", () => ({
  default: medicineVariantModel,
}));

vi.mock("../models/MedicineGroup.js", () => ({
  default: medicineGroupModel,
}));

vi.mock("../models/InsuranceProvider.js", () => ({
  default: insuranceProviderModel,
}));

vi.mock("../models/User.js", () => ({
  default: userModel,
}));

const { createApp } = await import("../app.js");

describe("claims routes", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    vi.clearAllMocks();
  });

  function createPatientToken() {
    return jwt.sign(
      {
        id: "507f191e810c19729de860ea",
        role: "patient",
      },
      process.env.JWT_SECRET
    );
  }

  it("rejects coverage checks without a JWT", async () => {
    const app = createApp();

    const response = await request(app).post("/api/claims/check-coverage").send({
      medicineVariantId: "507f191e810c19729de860eb",
      quantity: 1,
      insuranceProviderId: "507f191e810c19729de860ec",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication token missing");
  });

  it("returns the exact breakdown for a valid patient request", async () => {
    const app = createApp();

    userModel.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "507f191e810c19729de860ea",
        role: "patient",
        insuranceStatus: "active",
      }),
    });
    medicineVariantModel.findById.mockResolvedValue({
      _id: "507f191e810c19729de860eb",
      medicineGroupId: "507f191e810c19729de860ee",
      dosage: "500mg",
      form: "Capsule",
      basePrice: 5000,
    });
    medicineGroupModel.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "507f191e810c19729de860ee",
        genericName: "Amoxicillin",
        category: "Antibiotics",
      }),
    });
    insuranceProviderModel.findById.mockResolvedValue({
      _id: "507f191e810c19729de860ec",
      name: "RSSB - Mutuelle (Category 3)",
      coveragePercentage: 85,
    });

    const response = await request(app)
      .post("/api/claims/check-coverage")
      .set("Authorization", `Bearer ${createPatientToken()}`)
      .send({
        medicineVariantId: "507f191e810c19729de860eb",
        quantity: 2,
        insuranceProviderId: "507f191e810c19729de860ec",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "Verified",
      medicine: {
        variantId: "507f191e810c19729de860eb",
        genericName: "Amoxicillin",
        category: "Antibiotics",
        dosage: "500mg",
        form: "Capsule",
      },
      breakdown: {
        totalPriceRWF: 10000,
        coveredRWF: 8500,
        patientPaysRWF: 1500,
      },
      message: "Coverage verified based on seeded RSSB - Mutuelle (Category 3) data.",
    });
  });

  it("returns a clean 400 when quantity is not an integer", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/claims/check-coverage")
      .set("Authorization", `Bearer ${createPatientToken()}`)
      .send({
        medicineVariantId: "507f191e810c19729de860eb",
        quantity: "five",
        insuranceProviderId: "507f191e810c19729de860ec",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Quantity must be a whole number greater than or equal to 1."
    );
  });

  it("returns a clean 400 for an invalid medicine variant id", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/claims/check-coverage")
      .set("Authorization", `Bearer ${createPatientToken()}`)
      .send({
        medicineVariantId: "fake-medicine-id",
        quantity: 1,
        insuranceProviderId: "507f191e810c19729de860ec",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid medicine variant or insurance provider ID.");
  });

  it("rejects zero and negative quantities", async () => {
    const app = createApp();

    const zeroResponse = await request(app)
      .post("/api/claims/check-coverage")
      .set("Authorization", `Bearer ${createPatientToken()}`)
      .send({
        medicineVariantId: "507f191e810c19729de860eb",
        quantity: 0,
        insuranceProviderId: "507f191e810c19729de860ec",
      });

    expect(zeroResponse.status).toBe(400);
    expect(zeroResponse.body.message).toBe(
      "Quantity must be a whole number greater than or equal to 1."
    );

    const negativeResponse = await request(app)
      .post("/api/claims/check-coverage")
      .set("Authorization", `Bearer ${createPatientToken()}`)
      .send({
        medicineVariantId: "507f191e810c19729de860eb",
        quantity: -10,
        insuranceProviderId: "507f191e810c19729de860ec",
      });

    expect(negativeResponse.status).toBe(400);
    expect(negativeResponse.body.message).toBe(
      "Quantity must be a whole number greater than or equal to 1."
    );
  });

  it("returns a 403 when the patient's insurance is inactive", async () => {
    const app = createApp();

    userModel.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: "507f191e810c19729de860ea",
        role: "patient",
        insuranceStatus: "inactive",
      }),
    });

    const response = await request(app)
      .post("/api/claims/check-coverage")
      .set("Authorization", `Bearer ${createPatientToken()}`)
      .send({
        medicineVariantId: "507f191e810c19729de860eb",
        quantity: 1,
        insuranceProviderId: "507f191e810c19729de860ec",
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Insurance inactive. Please contact RSSB.");
  });
});
