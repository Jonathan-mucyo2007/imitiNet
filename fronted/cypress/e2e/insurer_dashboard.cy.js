describe('Insurer Dashboard Visualizations', () => {
    beforeEach(() => {
        cy.window().then((win) => {
            win.localStorage.setItem('imitinet_token', 'mock_verified_cypress_token');
        });

        cy.intercept('GET', '**/api/auth/me', {
            statusCode: 200,
            body: {
                user: {
                    id: 'mock_insurer_123',
                    email: 'director@rssb.rw',
                    role: 'insurer',
                    name: 'RSSB Dashboard Director'
                }
            }
        }).as('getAuthMe');

        cy.intercept('GET', '**/api/insurer/dashboard*', {
            statusCode: 200,
            body: {
                metrics: {
                    totalClaims: 2450, totalClaimsPctChange: "+12%", totalClaimsPositive: true,
                    approvedClaims: 1980, approvedClaimsPctChange: "+8%", approvedClaimsPositive: true,
                    pendingClaims: 320, pendingClaimsPctChange: "-5%", pendingClaimsPositive: true,
                    totalPayoutRWF: 12800000, totalPayoutPctChange: "+15%", totalPayoutPositive: true
                },
                trendData: [
                    { month: "Jan", volume: 150, currentAmount: 6000000, bankTransfer: 3000000, momo: 2000000, internalCheck: 1000000, airtelMoney: 0 },
                    { month: "Feb", volume: 200, currentAmount: 7000000, bankTransfer: 4000000, momo: 2000000, internalCheck: 1000000, airtelMoney: 0 },
                    { month: "Mar", volume: 300, currentAmount: 8500000, bankTransfer: 5000000, momo: 2500000, internalCheck: 1000000, airtelMoney: 0 },
                ],
                categoryDistribution: [
                    { name: 'Antibiotics', value: 850 },
                    { name: 'Pain Relief', value: 600 }
                ],
                recentClaims: [
                    {
                        _id: "c1",
                        claimId: "CLM-99887",
                        patientName: "Gahigi Patient",
                        totalAmountRWF: 12500,
                        coveredAmountRWF: 12500,
                        status: "Approved",
                        paymentChannel: "Bank Transfer",
                        submittedAt: "2026-04-10T12:00:00Z",
                        medicineSnapshot: [
                           { name: "Amoxicillin", standardizedCode: "AMOX-250", system: "ATC" }
                        ]
                    }
                ]
            }
        }).as('getDashboardData');

        cy.intercept('GET', '**/socket.io/?EIO=4&transport=polling*', {
            statusCode: 200,
            body: "ok"
        });

        cy.visit('/dashboard/insurer');
        cy.wait('@getAuthMe');
        cy.wait('@getDashboardData');
    });

    it('renders rigorous dashboard UI structure with correct financial configurations', () => {
        cy.get('[data-testid="kpi-total-claims"]').should('contain.text', '2');
        cy.get('[data-testid="kpi-total-claims"]').should('contain.text', '+12% This Quarter');

        cy.get('[data-testid="kpi-total-payout"]').should('contain.text', '12.8M RWF');
        cy.get('[data-testid="kpi-total-payout"]').should('contain.text', '+15% This Quarter');

        cy.get('[data-testid="kpi-pending-claims"]').should('contain.text', '-5% This Quarter');
        cy.get('[data-testid="kpi-pending-claims"] span').should('have.class', 'text-emerald-600');
    });

    it('successfully triggers area bounds and dynamic tables', () => {
        cy.get('[data-testid="volume-chart-container"]').should('be.visible');
        cy.get('[data-testid="cost-chart-container"]').should('be.visible');

        cy.get('.recharts-wrapper').first().trigger('mousemove', {
             clientX: 300, 
             clientY: 100, 
             force: true 
        });

        // Test Recent Claims mapped payload (standardized HFIR codes rendering)
        cy.contains('ATC').should('be.visible');
        cy.contains('AMOX-250').should('be.visible');
        cy.contains('Gahigi Patient').should('be.visible');
    });
});
