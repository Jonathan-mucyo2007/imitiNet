import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckInsurance from "./CheckInsurance";

vi.mock("../../components/layout/PatientLayout", () => ({
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

function renderCheckInsurance(routeState) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/patient/check-insurance",
          state: routeState,
        },
      ]}
    >
      <Routes>
        <Route path="/patient/check-insurance" element={<CheckInsurance />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("CheckInsurance page", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it("pre-fills medicine name and dosage from navigation state", async () => {
    mockGet.mockResolvedValue({
      data: [{ _id: "provider-1", name: "RSSB - Mutuelle (Category 1)" }],
    });

    renderCheckInsurance({
      medicineVariantId: "variant-1",
      genericName: "Amoxicillin",
      dosage: "500mg Capsule",
    });

    expect(await screen.findByDisplayValue("Amoxicillin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("500mg Capsule")).toBeInTheDocument();
  });

  it("shows the verification result after checking coverage", async () => {
    mockGet.mockResolvedValue({
      data: [{ _id: "provider-1", name: "RSSB - Mutuelle (Category 3)" }],
    });
    mockPost.mockResolvedValue({
      data: {
        status: "Verified",
        message: "Coverage verified based on seeded RSSB - Mutuelle (Category 3) data.",
        medicine: {
          variantId: "variant-1",
          genericName: "Amoxicillin",
          category: "Antibiotics",
          dosage: "500mg",
          form: "Capsule",
        },
        breakdown: {
          totalPriceRWF: 6600,
          coveredRWF: 5610,
          patientPaysRWF: 990,
        },
      },
    });

    renderCheckInsurance({
      medicineVariantId: "variant-1",
      genericName: "Amoxicillin",
      dosage: "500mg Capsule",
    });

    fireEvent.change(await screen.findByLabelText("Quantity"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check Coverage" }));

    expect(await screen.findByText("Status: Verified")).toBeInTheDocument();
    expect(screen.getByText("990 RWF")).toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledWith(
      "/claims/check-coverage",
      {
        medicineVariantId: "variant-1",
        quantity: 3,
        insuranceProviderId: "provider-1",
      },
      { timeout: 8000 }
    );
  });

  it("shows loader feedback and a timeout-safe error message", async () => {
    mockGet.mockResolvedValue({
      data: [{ _id: "provider-1", name: "RSSB - Mutuelle (Category 1)" }],
    });

    let rejectRequest;
    mockPost.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject;
      })
    );

    renderCheckInsurance({
      medicineVariantId: "variant-1",
      genericName: "Amoxicillin",
      dosage: "500mg Capsule",
    });

    fireEvent.click(await screen.findByRole("button", { name: "Check Coverage" }));
    expect(screen.getByText("Verifying your insurance coverage now...")).toBeInTheDocument();

    rejectRequest({ code: "ECONNABORTED" });

    await waitFor(() => {
      expect(
        screen.getByText("Unable to verify coverage at this time. Please try again.")
      ).toBeInTheDocument();
    });
  });
});
