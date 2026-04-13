describe("Receptionist verification workflow", () => {
  beforeEach(() => {
    cy.log("Bootstrapping receptionist auth and dashboard mocks");

    cy.intercept("GET", "**/api/auth/me", {
      statusCode: 200,
      body: {
        user: {
          id: "receptionist-1",
          email: "reception@imitinet.rw",
          role: "receptionist",
          fullName: "Kigali Reception Lead",
          facilityId: "HOSP-KGL-001",
        },
      },
    }).as("authMe");

    cy.intercept("POST", "**/api/auth/login", {
      statusCode: 200,
      body: {
        token: "mock-receptionist-token",
        user: {
          id: "receptionist-1",
          email: "reception@imitinet.rw",
          role: "receptionist",
          fullName: "Kigali Reception Lead",
          facilityId: "HOSP-KGL-001",
        },
      },
    }).as("login");

    cy.intercept("GET", "**/api/receptionist/dashboard", {
      statusCode: 200,
      body: {
        kpis: {
          totalPatientsVerifiedToday: 12,
          activeInsuredPatients: 9,
          claimsStarted: 5,
          verificationTrends: 18,
        },
        dailyVerificationVolume: [
          { day: "Mon", verifications: 12, claimsStarted: 3 },
          { day: "Tue", verifications: 18, claimsStarted: 5 },
        ],
        insuranceStatusDistribution: [
          { name: "Active", value: 9, color: "#1E56D0" },
          { name: "Inactive", value: 3, color: "#94A3B8" },
        ],
        recentVerifications: [],
      },
    }).as("dashboard");
  });

  it("logs in as receptionist and renders valid search results", () => {
    cy.log("Opening receptionist login");
    cy.visit("/login/Hospital%20Receptionist%20Portal");
    cy.get('input[name="email"]').type("reception@imitinet.rw");
    cy.get('input[name="password"]').type("reception@2026");
    cy.contains("button", "Injira").click();

    cy.wait("@login");
    cy.wait("@dashboard");
    cy.url().should("include", "/dashboard/receptionist");

    cy.intercept("POST", "**/api/receptionist/verify-patient", {
      statusCode: 200,
      body: {
        verificationToken: "VRF-12345",
        bridge: {
          openClinicUrl:
            "https://openclinic-ga.local/claims/start?verificationToken=VRF-12345",
        },
        nida: {
          data: {
            patient_name: "Aline Uwase",
            date_of_birth: "1995-08-14",
            gender: "Female",
            patient_photo:
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='160'></svg>",
            verified_at: new Date().toISOString(),
          },
        },
        rssb: {
          data: {
            patient_status: "verified",
            insurance_active: true,
            verified_at: new Date().toISOString(),
            claim_reference: "CLM-48392",
            provider_code: "ICD-10-RW-OPC-014",
            medicine_reference: "ATC_AMOX-125",
          },
        },
      },
    }).as("verifySuccess");

    cy.visit("/dashboard/receptionist/verify");
    cy.get("[data-testid='receptionist-id-input']").type("1199580012345678");
    cy.get("[data-testid='receptionist-search-btn']").click();
    cy.wait("@verifySuccess");

    cy.log("Asserting NIDA and RSSB render states");
    cy.get("[data-testid='nida-card']").should("contain.text", "Aline Uwase");
    cy.get("[data-testid='rssb-card']").should("contain.text", "Patient Verified");
    cy.get("[data-testid='verification-token']").should("contain.text", "VRF-12345");
  });

  it("shows client-side validation errors for invalid ID input", () => {
    cy.log("Checking invalid client-side validation");
    cy.visit("/dashboard/receptionist/verify", {
      onBeforeLoad(win) {
        win.localStorage.setItem("imitinet_token", "mock-receptionist-token");
      },
    });
    cy.wait("@authMe");
    cy.get("[data-testid='receptionist-id-input']").type("12345");
    cy.get("[data-testid='receptionist-search-btn']").should("be.disabled");
    cy.get("[data-testid='receptionist-validation-error']").should(
      "contain.text",
      "National ID must contain exactly 16 digits."
    );
  });

  it("shows not found error state when patient is missing", () => {
    cy.log("Testing not found state");
    cy.visit("/dashboard/receptionist/verify", {
      onBeforeLoad(win) {
        win.localStorage.setItem("imitinet_token", "mock-receptionist-token");
      },
    });
    cy.wait("@authMe");

    cy.intercept("POST", "**/api/receptionist/verify-patient", {
      statusCode: 404,
      body: {
        message: "No patient found in the NIDA registry for the supplied ID.",
      },
    }).as("verifyMissing");

    cy.get("[data-testid='receptionist-id-input']").type("0000000000000000");
    cy.get("[data-testid='receptionist-search-btn']").click();
    cy.wait("@verifyMissing");
    cy.get("[data-testid='receptionist-error-state']").should(
      "contain.text",
      "No patient found in the NIDA registry for the supplied ID."
    );
  });
});
