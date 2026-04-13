// =============================================================================
// Cypress Configuration — ImitiNet Platform
// =============================================================================
// Registers the Phase 5 "checkDatabasePHI" custom task that connects directly
// to the MongoDB Atlas instance to audit PHI storage constraints.
// =============================================================================

import { defineConfig } from "cypress";
import { MongoClient } from "mongodb";
import crypto from "crypto";

/**
 * Hash a raw ID number with SHA-256 — mirrors the backend implementation in
 * patientVerificationController.js so we can query by hashedIdNumber.
 */
function hashIdNumber(idNumber) {
  return crypto.createHash("sha256").update(idNumber).digest("hex");
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",

    // Disable the default support file (we define Custom Commands inline in the spec)
    supportFile: false,

    // Video recording — enable to capture Golden Path test runs as evidence
    video: false,

    // Screenshots on failure — useful for CI pipelines
    screenshotOnRunFailure: true,

    // Default timeouts — generous for CI environments
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,

    // ==========================================================================
    // Node Events — Server-Side Tasks (Phase 5 Zero-Trust DB Audit)
    // ==========================================================================
    setupNodeEvents(on, config) {
      /**
       * cy.task("checkDatabasePHI", { testIdNumber, verificationToken })
       * ─────────────────────────────────────────────────────────────────
       * Connects to the live MongoDB instance, then queries both the
       * "patientverifications" and "claims" collections for any document that
       * contains raw PHI fields (patient_photo, date_of_birth, id_number).
       *
       * Returns a structured audit report consumed by Phase 5 assertions.
       *
       * @returns {Promise<{
       *   patientVerification: {
       *     hasPatientPhoto: boolean,
       *     hasDateOfBirth: boolean,
       *     hasRawIdNumber: boolean,
       *     hasHashedIdNumber: boolean,
       *     hasVerificationToken: boolean,
       *   },
       *   claims: {
       *     hasPatientPhoto: boolean,
       *     hasDateOfBirth: boolean,
       *     hasRawIdNumber: boolean,
       *     hasVerificationToken: boolean,
       *   }
       * }>}
       */
      on("task", {
        async checkDatabasePHI({ testIdNumber, verificationToken }) {
          // Read the MongoDB URI from the environment — falls back to .env value
          const MONGODB_URI =
            process.env.MONGODB_URI ||
            "mongodb+srv://imitinetAdmin:imitinetAdmin2026@imitinet-cluster.x3ayg6i.mongodb.net/imitinet?retryWrites=true&w=majority&appName=imitinet-cluster";

          const client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
          });

          try {
            await client.connect();
            const db = client.db(); // Uses the DB from the URI

            const hashedId = hashIdNumber(testIdNumber);

            // ── PatientVerification collection audit ──────────────────────
            const pvCollection = db.collection("patientverifications");

            // Check if the verification token document exists
            const pvDoc = await pvCollection.findOne({ _id: verificationToken });

            // Also check broadly for any document containing raw PHI fields
            // (These fields should NEVER appear — they are session-only per the controller)
            const pvWithPhoto = await pvCollection.findOne({ patient_photo: { $exists: true } });
            const pvWithDob = await pvCollection.findOne({ date_of_birth: { $exists: true } });
            const pvWithRawId = await pvCollection.findOne({ id_number: { $exists: true } });
            const pvWithHashedId = await pvCollection.findOne({ hashedIdNumber: hashedId });

            // ── Claims collection audit ───────────────────────────────────
            const claimsCollection = db.collection("claims");

            const claimWithToken = await claimsCollection.findOne({
              verificationToken: verificationToken,
            });

            // These fields should NEVER appear in the Claims collection
            const claimWithPhoto = await claimsCollection.findOne({ patient_photo: { $exists: true } });
            const claimWithDob = await claimsCollection.findOne({ date_of_birth: { $exists: true } });
            const claimWithRawId = await claimsCollection.findOne({ id_number: { $exists: true } });

            return {
              patientVerification: {
                // PHI fields that MUST NOT be present
                hasPatientPhoto: pvWithPhoto !== null,
                hasDateOfBirth: pvWithDob !== null,
                hasRawIdNumber: pvWithRawId !== null,
                // Privacy-safe identifiers that MUST be present
                hasHashedIdNumber: pvWithHashedId !== null,
                hasVerificationToken: pvDoc !== null,
              },
              claims: {
                // PHI fields that MUST NOT be present
                hasPatientPhoto: claimWithPhoto !== null,
                hasDateOfBirth: claimWithDob !== null,
                hasRawIdNumber: claimWithRawId !== null,
                // Cross-reference key that should be present on linked claims
                hasVerificationToken: claimWithToken !== null,
              },
            };
          } finally {
            await client.close();
          }
        },
      });

      return config;
    },
  },
});
