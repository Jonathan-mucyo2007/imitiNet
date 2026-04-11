import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewClaim from "./NewClaim";

vi.mock("../../components/layout/PharmacyLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("../../services/api", () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
  },
}));

describe("NewClaim page", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();

    mockGet.mockImplementation((url) => {
      if (url === "/patients") {
        return Promise.resolve({
          data: {
            patients: [
              {
                id: "patient-1",
                fullName: "Aline Uwase",
                email: "aline.uwase@imitinet.rw",
                nationalId: "1199580012345678",
                insuranceStatus: "active",
              },
            ],
          },
        });
      }

      if (url === "/claims/providers") {
        return Promise.resolve({
          data: [{ _id: "provider-1", name: "RSSB - Mutuelle (Category 3)" }],
        });
      }

      if (url === "/prescriptions/patient/patient-1") {
        return Promise.resolve({
          data: {
            prescription: {
              id: "prescription-1",
              prescriptionId: "RX-77123",
              prescribingDoctor: "Dr. Ange Mukeshimana",
              originatingEmr: "eUbuzima",
              status: "Active",
              medications: [
                {
                  medicineVariantId: "variant-1",
                  medicineName: "Amoxicillin",
                  category: "Antibiotics",
                  dosage: "500mg",
                  form: "Capsule",
                  basePrice: 2200,
                  quantity: 2,
                  instructions: "Take one capsule twice daily after meals for 5 days.",
                },
              ],
            },
          },
        });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    mockPost.mockImplementation((url) => {
      if (url === "/claims/preview") {
        return Promise.resolve({
          data: {
            status: "Verified",
            eligibilityMessage: "Eligibility Verified: Category 3.",
            prescription: {
              id: "prescription-1",
              prescriptionId: "RX-77123",
              patientName: "Aline Uwase",
            },
            provider: {
              id: "provider-1",
              name: "RSSB - Mutuelle (Category 3)",
              coveragePercentage: 85,
            },
            breakdown: {
              totalAmountRWF: 4400,
              coveredAmountRWF: 3740,
              patientPaysRWF: 660,
            },
          },
        });
      }

      if (url === "/claims/submit") {
        return Promise.resolve({
          data: {
            message: "Claim CLM-99182 Submitted Successfully.",
            claim: {
              id: "claim-1",
              claimId: "CLM-99182",
              status: "Approved",
            },
          },
        });
      }

      return Promise.reject(new Error(`Unhandled POST ${url}`));
    });
  });

  it("loads a patient prescription, verifies coverage, and submits the claim", async () => {
    render(
      <MemoryRouter>
        <NewClaim />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /search and select a patient/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Aline Uwase/i }));

    expect(await screen.findByText("RX-77123")).toBeInTheDocument();
    expect(screen.getByText("Amoxicillin")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Initiate Instant Insurance Verification/i })
    );

    expect(await screen.findByText("Eligibility Verified: Category 3.")).toBeInTheDocument();
    expect(screen.getByText("RWF 660")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Submit Claim/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Claim CLM-99182 Submitted Successfully.")
      ).toBeInTheDocument();
    });
  });
});
