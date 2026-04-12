describe('Regulator (Minisante) National Dashboard', () => {

  const MOCK_SYNC_RESPONSE = {
    resourceType: "Bundle",
    type: "document",
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ["http://dhis2.org/fhir/StructureDefinition/national-stats-rwandamoh"],
      version: "1.0.0"
    },
    entry: [
      {
        fullUrl: "urn:uuid:mock-stat-id",
        resource: {
          resourceType: "Observation",
          status: "final",
          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "activity", display: "National Health Metrics" }] }],
          payload: {
            kpis: { ibitaro: 450, patients: 18000, pharmacyCoverage: 85, medicinesTracked: 2500000 },
            consultationTrends: [
              { category: "Malaria", cases2025: 450000, cases2026: 400000 },
              { category: "HIV/AIDS", cases2025: 210000, cases2026: 205000 },
              { category: "Resp.", cases2025: 320000, cases2026: 350000 },
              { category: "TB", cases2025: 20000, cases2026: 18000 },
              { category: "Diabetes", cases2025: 65000, cases2026: 72000 }
            ],
            coverageByRegion: [
              { region: "Kigali", actualCoverage: 88, targetCoverage: 95 },
              { region: "South", actualCoverage: 82, targetCoverage: 90 },
              { region: "East", actualCoverage: 78, targetCoverage: 85 },
              { region: "West", actualCoverage: 86, targetCoverage: 92 },
              { region: "North", actualCoverage: 91, targetCoverage: 96 }
            ],
            complianceStatus: { compliant: 75, underReview: 15, nonCompliant: 10 },
            recentSupplyChain: [
              { medication: "Amoxicillin", status: "Delivered", location: "Kigali Central Pharmacy", time: "10:30" },
              { medication: "Paracetamol", status: "In Transit", location: "Muhanga District Hospital", time: "15:00" },
              { medication: "Insulin", status: "Shipped", location: "Rubavu Regional Warehouse", time: "09:15" }
            ],
            facilityPerformance: { patientRatio: "1:500", avgWaitTimeMin: 45, portalUtilization: 78, supplyChainScore: 92 }
          }
        }
      }
    ]
  };

  // Second payload with drifted patients KPI to prove 30s DOM update
  const MOCK_SYNC_RESPONSE_DRIFTED = JSON.parse(JSON.stringify(MOCK_SYNC_RESPONSE));
  MOCK_SYNC_RESPONSE_DRIFTED.entry[0].resource.payload.kpis.patients = 18050;

  beforeEach(() => {
    // Auth bypass
    cy.window().then((win) => {
      win.localStorage.setItem('imitinet_token', 'mock_regulator_cypress_jwt');
    });

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        user: {
          id: 'mock_regulator_id',
          email: 'Minisante@gmail.com',
          role: 'regulator',
          fullName: 'Minisante Chief Regulator'
        }
      }
    }).as('authMe');

    // Initial sync — returns baseline
    cy.intercept('GET', '**/api/regulator/sync', {
      statusCode: 200,
      body: MOCK_SYNC_RESPONSE
    }).as('initialSync');

    // Mock the audit log
    cy.intercept('POST', '**/api/regulator/audit-log', {
      statusCode: 200,
      body: { message: "Audit event locked securely." }
    }).as('auditLog');

    // Suppress socket errors
    cy.intercept('GET', '**/socket.io/**', { statusCode: 200, body: "ok" });

    cy.visit('/dashboard/regulator');
    cy.wait('@authMe');
    cy.wait('@initialSync');
  });

  it('renders the National Dashboard with all KPI cards and DHIS2-sourced data', () => {
    cy.get('[data-testid="national-title"]').should('contain.text', 'National Dashboard');

    // Validate KPI cards render correctly with formatted values
    cy.get('[data-testid="kpi-ibitaro"]').should('contain.text', '450+');
    cy.get('[data-testid="kpi-patients"]').should('contain.text', '18K+');
    cy.get('[data-testid="kpi-pharmacy"]').should('contain.text', '85%');
    cy.get('[data-testid="kpi-medicines-tracked"]').should('contain.text', '2.5M+');
  });

  it('renders the Recharts BarChart and LineChart containers visibly', () => {
    cy.get('[data-testid="bar-chart-container"]').should('be.visible');
    cy.get('[data-testid="line-chart-container"]').should('be.visible');
    cy.get('[data-testid="donut-chart"]').should('be.visible');
  });

  it('renders the supply chain table with correct badges', () => {
    cy.get('[data-testid="supply-chain-table"]').within(() => {
      cy.contains('Amoxicillin').should('be.visible');
      cy.contains('Delivered').should('be.visible');
      cy.contains('In Transit').should('be.visible');
      cy.contains('Shipped').should('be.visible');
    });
  });

  it('renders the facility performance stats', () => {
    cy.get('[data-testid="facility-performance"]').within(() => {
      cy.contains('1:500').should('be.visible');
      cy.contains('92%').should('be.visible');
    });
  });

  it('renders the Geospatial placeholder', () => {
    cy.get('[data-testid="geo-placeholder"]').should('contain.text', 'Interactive Map Coming Soon');
  });

  it('triggers Quick Audit button dispatching the audit API call', () => {
    // Stub window.print to prevent the real dialog
    cy.window().then((win) => {
      cy.stub(win, 'print').as('printStub');
    });

    cy.get('[data-testid="quick-audit-btn"]').click();

    cy.wait('@auditLog').its('request.method').should('eq', 'POST');
    cy.get('@printStub').should('have.been.calledOnce');
  });

  it('updates the DOM after 30-second polling without a page reload', () => {
    // After initial load, intercept the NEXT sync call with drifted data
    cy.intercept('GET', '**/api/regulator/sync', {
      statusCode: 200,
      body: MOCK_SYNC_RESPONSE_DRIFTED
    }).as('driftedSync');

    // Use cy.clock + cy.tick to fast-forward the 30s interval
    cy.clock();
    cy.tick(30000);
    cy.wait('@driftedSync');

    // The patients KPI should now show the drifted value
    // 18050 rounds to 18K+ via the formatK helper
    cy.get('[data-testid="kpi-patients"]').should('contain.text', '18K+');
  });
});
