import { EventEmitter } from "events";

class TraceabilityGateway extends EventEmitter {
  constructor() {
    super();
    this.lastSyncedAt = new Date();
    this.syncLog = [];

    // Background listener — non-blocking
    this.on("inventory_mutated", (payload) => {
      this._simulateFdaSync(payload);
    });
  }

  async _simulateFdaSync(payload) {
    const entry = {
      timestamp: new Date(),
      pharmacyId: payload.pharmacyId,
      variantId: payload.variantId,
      changeType: payload.changeType, // "DISPENSED" | "RESTOCKED"
      quantityDelta: payload.quantityDelta || 0,
      batchNumber: payload.batchNumber || null,
    };

    // Simulate network latency to external FDA gateway (300-800ms)
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));

    this.syncLog.unshift(entry);
    if (this.syncLog.length > 100) this.syncLog.pop(); // Keep last 100 entries
    this.lastSyncedAt = new Date();

    console.log(
      `--- FDA SYNC --- [${entry.changeType}] Variant ${entry.variantId} | ` +
      `Qty Δ: ${entry.quantityDelta} | Batch: ${entry.batchNumber} | ` +
      `Synced at ${this.lastSyncedAt.toISOString()}`
    );
  }

  getStatus() {
    return {
      status: "Active",
      lastSyncedAt: this.lastSyncedAt,
      recentSyncs: this.syncLog.slice(0, 5),
    };
  }
}

// Singleton — shared across the entire backend process
const traceabilityGateway = new TraceabilityGateway();

export default traceabilityGateway;
