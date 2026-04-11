import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FindMedicine from "./FindMedicine";
import CheckInsurance from "./CheckInsurance";

vi.mock("../../components/layout/PatientLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  Marker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
}));

vi.mock("leaflet", () => ({
  default: {
    Icon: {
      Default: {
        prototype: {
          _getIconUrl: () => "",
        },
        mergeOptions: vi.fn(),
      },
    },
  },
}));

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("../../services/api", () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
  },
}));

describe("Find medicine to insurance flow", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({
            coords: {
              latitude: -1.9441,
              longitude: 30.0619,
            },
          })
        ),
      },
    });

    mockGet.mockImplementation((url) => {
      if (url === "/inventory/search") {
        return Promise.resolve({
          data: {
            results: [
              {
                pharmacy: {
                  id: "pharmacy-1",
                  name: "Kigali Central Pharmacy",
                  address: "KN 3 Rd, Nyarugenge, Kigali",
                  contact: "+250 788 100 101",
                  rating: 4.8,
                  location: { coordinates: [30.0619, -1.9441] },
                },
                medicineGroup: {
                  id: "group-1",
                  name: "Amoxicillin",
                  category: "Antibiotics",
                  description: "Broad-spectrum antibiotic commonly prescribed for bacterial infections.",
                },
                availableVariants: [
                  {
                    variantId: "variant-250",
                    dosage: "250mg",
                    form: "Capsule",
                    priceRWF: 1500,
                    stockStatus: "In Stock",
                  },
                  {
                    variantId: "variant-500",
                    dosage: "500mg",
                    form: "Capsule",
                    priceRWF: 2200,
                    stockStatus: "Low Stock",
                  },
                ],
                distanceKm: 0.4,
              },
            ],
            featuredPharmacies: [],
          },
        });
      }

      if (url === "/claims/providers") {
        return Promise.resolve({
          data: [{ _id: "provider-1", name: "RSSB - Mutuelle (Category 1)" }],
        });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
  });

  it(
    "navigates from search results into the insurance page with prefilled medicine data",
    async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/patient"]}>
        <Routes>
          <Route path="/dashboard/patient" element={<FindMedicine />} />
          <Route path="/patient/check-insurance" element={<CheckInsurance />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Search medicines, pharmacies..."), {
      target: { value: "Amoxicillin" },
    });

    fireEvent.change(await screen.findByLabelText("Select Dosage"), {
      target: { value: "variant-500" },
    });

    fireEvent.click(await screen.findByRole("button", { name: "Check Insurance" }));

    expect(await screen.findByDisplayValue("Amoxicillin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("500mg Capsule")).toBeInTheDocument();
    },
    10000
  );

  it("shows static dosage text instead of a dropdown when only one variant is stocked", async () => {
    mockGet.mockImplementation((url) => {
      if (url === "/inventory/search") {
        return Promise.resolve({
          data: {
            results: [
              {
                pharmacy: {
                  id: "pharmacy-1",
                  name: "Kigali Central Pharmacy",
                  address: "KN 3 Rd, Nyarugenge, Kigali",
                  contact: "+250 788 100 101",
                  rating: 4.8,
                  location: { coordinates: [30.0619, -1.9441] },
                },
                medicineGroup: {
                  id: "group-1",
                  name: "Doxycycline",
                  category: "Antibiotics",
                  description: "Antibiotic used for respiratory infections and acne.",
                },
                availableVariants: [
                  {
                    variantId: "variant-100",
                    dosage: "100mg",
                    form: "Capsule",
                    priceRWF: 2500,
                    stockStatus: "In Stock",
                  },
                ],
                distanceKm: 0.2,
              },
            ],
            featuredPharmacies: [],
          },
        });
      }

      if (url === "/claims/providers") {
        return Promise.resolve({
          data: [{ _id: "provider-1", name: "RSSB - Mutuelle (Category 1)" }],
        });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/patient"]}>
        <Routes>
          <Route path="/dashboard/patient" element={<FindMedicine />} />
          <Route path="/patient/check-insurance" element={<CheckInsurance />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Search medicines, pharmacies..."), {
      target: { value: "Doxycycline" },
    });

    expect(await screen.findByText("100mg Capsule")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
