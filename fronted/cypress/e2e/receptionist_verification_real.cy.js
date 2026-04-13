describe("Receptionist verification workflow with live local services", () => {
  const timestamp = Date.now();
  const receptionist = {
    fullName: "Receptionist Live Test",
    email: `receptionist.live.${timestamp}@imitinet.rw`,
    password: "ReceptionLive@2026",
    role: "receptionist",
    facilityId: "HOSP-KGL-LIVE",
  };

  before(() => {
    cy.log(`Registering live receptionist user: ${receptionist.email}`);
    cy.request({
      method: "POST",
      url: "http://127.0.0.1:5000/api/auth/register",
      failOnStatusCode: false,
      body: receptionist,
    }).then((response) => {
      cy.log(`Registration status: ${response.status}`);
      expect([201, 409]).to.include(response.status);
    });
  });

  it("logs in and verifies receptionist search states against the live backend", () => {
    cy.log("Opening receptionist portal login");
    cy.visit("/login/Hospital%20Receptionist%20Portal");

    cy.get('input[name="email"]').type(receptionist.email);
    cy.get('input[name="password"]').type(receptionist.password);
    cy.contains("button", "Injira").click();

    cy.url({ timeout: 15000 }).should("include", "/dashboard/receptionist");

    cy.log("Checking invalid client-side validation");
    cy.visit("/dashboard/receptionist/verify");
    cy.get("[data-testid='receptionist-id-input']").clear().type("12345");
    cy.get("[data-testid='receptionist-search-btn']").should("be.disabled");
    cy.get("[data-testid='receptionist-validation-error']").should(
      "contain.text",
      "National ID must contain exactly 16 digits."
    );

    cy.log("Running valid patient verification against live backend");
    cy.get("[data-testid='receptionist-id-input']").clear().type("1199580012345678");
    cy.get("[data-testid='receptionist-search-btn']").click();
    cy.get("[data-testid='nida-card']", { timeout: 15000 }).should(
      "contain.text",
      "Aline Uwase"
    );
    cy.get("[data-testid='rssb-card']").should("contain.text", "Patient Verified");
    cy.get("[data-testid='verification-token']").should("exist");

    cy.log("Running not-found patient verification against live backend");
    cy.get("[data-testid='receptionist-id-input']").clear().type("0000000000000000");
    cy.get("[data-testid='receptionist-search-btn']").click();
    cy.get("[data-testid='receptionist-error-state']", { timeout: 15000 }).should(
      "contain.text",
      "No patient found in the NIDA registry for the supplied ID."
    );
  });
});
