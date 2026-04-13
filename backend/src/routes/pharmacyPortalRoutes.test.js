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

  it("blocks patient tokens from the RX retrieval endpoint", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/api/pharmacy/prescription/retrieve/RX-782-KGL")
      .set("Authorization", `Bearer ${createToken("patient")}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden");
  });

  it("returns not found for an invalid RX code", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/api/pharmacy/prescription/retrieve/NOT-A-REAL-RX")
      .set("Authorization", `Bearer ${createToken("pharmacy")}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Invalid or expired RX code.");
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
