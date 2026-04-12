# Phase 2.3 TESTING CHECKLIST

This document dictates the End-to-End Acid Test required to validate the Real-Time MERN UI capabilities built in Phase 2.3 for the Pharmacy command center. 

## Pre-requisites
- The database must be seeded containing at least 6 low/expiring stock alerts to test overflow. Let's assume the previous seed output `Seed complete: 218 inventory records`.

## Step-by-Step Protocol

### Test Case 1: Scrollable Alert Column
1. Navigate to `http://localhost:5173/` and login with `pharmacy.admin@imitinet.rw` and `Password123!`. Navigate to **Inventory Management**.
2. **Action**: Look at the right-hand column under "Critical Alerts".
3. **Assertion**: Verify the custom-scrollbar is present. The entire page should remain a fixed 2-column layout (no jumping elements beyond the footer), but you should be able to scroll through the multiple alerts individually.

### Test Case 2: View Mode (Eye Icon)
1. **Action**: Locate the first row in the Full Inventory List table. (e.g., *Amoxicillin 125mg/5ml*) and hover over it.
2. **Action**: Click the `Eye` icon (View details) at the rightmost end of the row.
3. **Assertion**: A 3D dialog should spring open. Verify that all values (Quantity, Unit Price, Expiry Date, Location) are displayed as purely read-only styled text badges. The "Save Changes" button MUST NOT be visible.
4. **Action**: Click the `Close` button or click the blurred backdrop to dismiss.

### Test Case 3: Actionable Edit Mode (Edit Icon)
1. **Action**: In the Full Inventory List, locate a "Low Stock" medicine (e.g., Artemether-Lumefantrin 20/120mg marked as LOW STOCK). Note its current Quantity (e.g., `3`) and the Total Stock Value in the KPI cards.
2. **Action**: Click the `Edit` icon (pencil/Edit3) on that specific row.
3. **Assertion**: The 3D dialog should spring open. Verify that input fields are present. The "Save Changes" button MUST be visible.

### Test Case 4: Acid Test - The Real-Time React Sync
1. **Action**: Inside the Edit modal, change the `Quantity` input from `3` to `200`.
2. **Action**: Change the `Unit Price` to something different (e.g., `5000`).
3. **Action**: Click `Save Changes`.
4. **Assertion [STRICT]**: Watch carefully! The modal should dismiss automatically. 
5. **Assertion [STRICT]**: *WITHOUT the browser refreshing the page/spinning the tab reload icon*, the following must instantly happen:
    - The "Low Stock Alert" for this item in the right column must disappear instantly (because quantity > 20).
    - The **Total Stock Value** KPI card must have dynamically recalculated and increased strictly reflecting `200 * 5000 = 1,000,000` addition.
    - The Full Inventory List must show `200` in the row for quantity and `IN STOCK` status badge.

### Test Case 5: Enterprise Safeguards Checks
1. **Action**: Re-open any Edit Modal.
2. **Action**: Attempt to input `-5` into the Quantity field.
3. **Action**: Click `Save`.
4. **Assertion**: A UI error banner must appear stating "Quantity cannot be negative." 
5. **Action**: Change Quantity back to a positive number, but change Expiry to a date from exactly 1 year ago.
6. **Action**: Click `Save`.
7. **Assertion**: A UI error banner must appear stating "Expiry date cannot be in the past."

---
*If all Assertions execute identically to defined behaviors, Phase 2.3 is successfully cleared for production.*
