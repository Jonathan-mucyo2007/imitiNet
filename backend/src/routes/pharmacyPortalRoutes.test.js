import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

const { createApp } = await import("../app.js");

describe("pharmacy portal routes", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  function createToken(role) {
    return jwt.sign(
      {
        id: "507f191e810c19729de860ea",
        role,
      },
      process.env.JWT_SECRET
    );
  }

  it("blocks patient tokens from the pharmacy patient list endpoint", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/api/patients")
      .set("Authorization", `Bearer ${createToken("patient")}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("blocks patient tokens from the prescription gateway endpoint", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/api/prescriptions/patient/507f191e810c19729de860eb")
      .set("Authorization", `Bearer ${createToken("patient")}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("rejects invalid patient ids for the prescription gateway", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/api/prescriptions/patient/not-a-valid-id")
      .set("Authorization", `Bearer ${createToken("pharmacy")}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid patient ID.");
  });

  it("rejects invalid ids when previewing a pharmacy claim", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/claims/preview")
      .set("Authorization", `Bearer ${createToken("pharmacy")}`)
      .send({
        prescriptionId: "invalid-prescription-id",
        insuranceProviderId: "invalid-provider-id",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid prescription or insurance provider ID.");
  });

  it("rejects invalid ids when submitting a pharmacy claim", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/claims/submit")
      .set("Authorization", `Bearer ${createToken("pharmacy")}`)
      .send({
        prescriptionId: "invalid-prescription-id",
        insuranceProviderId: "invalid-provider-id",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid prescription or insurance provider ID.");
  });
});
