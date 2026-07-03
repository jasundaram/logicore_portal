# System Design Specification: Logistics Delivery Management

This document provides a technical specification of the core subsystems governing the Logistics Delivery Management Platform, focusing on deterministic calculation formulas, spatial/zone matching, constraint-based assignment heuristics, and exception workflow state machines.

---

## 1. Rate Calculation Engine Architecture

The pricing calculation is handled by a deterministic, zero-dependency server-side engine designed to enforce the higher of physical versus dimensional constraints. This prevents revenue leakage on low-density, high-volume items (e.g., lightweight styrofoam crates).

### Calculation Sequence
1. **Volumetric Sizing**: Given cargo dimensions length ($L$), width ($W$), and height ($H$) in centimeters, the volumetric weight ($W_{vol}$) is calculated using the industry-standard IATA divisor:
   $$W_{vol} = \frac{L \times W \times H}{5000}$$
2. **Chargeable Weight determination ($W_{chg}$)**: The system takes the ceiling parameter of physical weight versus volumetric weight:
   $$W_{chg} = \max(W_{actual}, W_{vol})$$
3. **Card Lookup**: The engine detects whether the shipment is classified as an **Intra-Zone** (pickup zone equals drop zone) or **Inter-Zone** (different zones) shipment. It queries the `rateCards` table to find the policy matching the zone type and client type (**B2B** or **B2C**).
4. **Surplus Calculation**:
   $$\text{Weight}_{surplus} = \max(0, W_{chg} - \text{Weight}_{limit})$$
   $$\text{Charge}_{weight} = \text{Weight}_{surplus} \times \text{Rate}_{perKg}$$
5. **COD Surcharges & Grand Total**:
   $$\text{Total} = \text{BaseRate} + \text{Charge}_{weight} + \text{Surcharge}_{COD}$$

All parameters—base rates, limit thresholds, incremental per-kg rates, and cash-handling surcharges—are dynamically loaded from the database and administered via the admin interface to eliminate hardcoded assumptions.

---

## 2. Spatial Territory Zone Detection Approach

Rather than relying on brittle, third-party spatial queries for simple address fields, the system partitions territory coverage using a deterministic, tokenized substring-matching search array.

### Detection Mechanism
- **Zone Indexes**: Admin users map custom zones (e.g., *Downtown*) to an array of coverage area keywords, postal nodes, or suburban names (e.g., `["Downtown", "Soho", "Financial District"]`).
- **Normalized Query Matching**: When a customer submits an address, the system extracts the `Area` parameter (e.g., "Soho") and normalizes it to lowercase with stripped white spaces.
- **Substring Scanning**: The engine performs a case-insensitive substring search:
  ```typescript
  const match = zone.coverageAreas.some(cov => 
    cov.toLowerCase() === inputArea || inputArea.includes(cov.toLowerCase())
  );
  ```
If a customer selects a serviced suburb (such as "Chinatown"), the system automatically matches the pickup area to "Downtown", allowing accurate and instant tariff lookup.

---

## 3. Heuristic Auto-Assignment Engine

Automated driver matching is implemented via a multi-tier greedy constraint solver that matches cargo to active resources based on location, duty state, and routing efficiency.

### Priority Selection Heuristic
The solver processes available agents in a prioritized fallback cascade:
1. **Zonal Affiliation (Tier 1)**: Filter for agents whose `status` is `"available"` and whose `currentZone` matches the parcel's `pickupZone`. This minimizes travel distance to the pickup point and speeds up first-mile collection.
2. **Spatially Nearest Available (Tier 2)**: If no agents are active inside the pickup zone, the system scans for any available agent in neighboring zones, choosing the closest agent.
3. **Queue / Manual Allocation (Tier 3)**: If all active agents are flagged as `"busy"`, the order remains in `Created` status. The admin is notified of resource saturation, allowing manual driver overrides or queue queuing.

When an assignment is confirmed, the database flags the agent as `"busy"`, preventing race conditions where one agent is booked for overlapping routes.

---

## 4. Failed Delivery Lifecycle State Machine

A crucial operational metric in logistics is first-attempt failure recovery. The system implements an automated transition loop that preserves tracking history while resetting courier schedules.

```
       [Created]
           │
           ▼ (Assign Agent)
       [Assigned]
           │
           ▼ (Courier Pick-Up)
       [Picked Up] ──► [In Transit] ──► [Out for Delivery]
                                                 │
                             ┌───────────────────┴───────────────────┐
                             ▼ (Success)                             ▼ (Fail)
                       [Delivered]                                [Failed]
                                                                     │
                                                                     ▼ (Customer Reschedule)
                                                                 [Created] (Re-assigns new Agent)
```

### Operational Workflow
1. **Transition & Logging**: The courier sets the order state to `"Failed"`, providing an mandatory comment (e.g., "Gate code locked"). The database logs this in an immutable tracking timeline.
2. **Resource Release**: The courier is automatically released back to `"available"`, allowing them to take other local shipments without delay.
3. **Rescheduling & Auto-Reassignment**: The customer is notified via simulated Email/SMS. The portal prompts them to submit a redelivery date. Submitting this:
   - Resets the status of the order to `"Created"`.
   - Clears the previous courier's assignment.
   - Automatically re-triggers the **Intelligent Auto-Assignment Engine**, matching a new courier who is active on the scheduled date.
   - Appends a comprehensive timeline log capturing the customer's special instructions.
