# Corvo Engineering Procurement Decision Log & Architectural Justifications (`DECISIONS.md`)

This document records all business judgments, policy ambiguities, edge case treatments, scoring formulations, and data reconciliation decisions made for the Corvo Engineering PR-to-PO automated procurement engine.

---

## 1. Item Matching & Description Resolution (Clause 1.1 & 1.2)

### 1.1 Ambiguity & Observation
In `sample_pr_batch.csv`, 39 rows have no `item_code`. Furthermore, 14 of these rows have neither `item_code` nor `estimated_unit_price`.

### 1.2 Engineering Decision
1. **Catalog Matching Precedes New Item Classification:** Description matching is performed against all 73 items in `item_master.csv` before deciding if an item is new.
2. **Deterministic Token & Substring Normalization:**
   - Abbreviations are canonicalized: `brg` $\to$ `ball bearing`, `pneu` $\to$ `pneumatic`, `hyd` $\to$ `hydraulic`, `welding rod` $\to$ `welding electrode`, `monitor 24"` $\to$ `24 inch monitor`.
   - Requisition noise tokens (`for maintenance`, `urgent`, `as per sample`, `repeat`, `nos`, `kg`, etc.) are stripped.
   - Jaccard similarity and bidirectional token subset matching are computed. A composite confidence threshold $\ge 0.8$ constitutes a match.
3. **Data Audit Outcome:**
   - 37 out of 39 missing item code rows were matched to catalog items with 100% precision.
   - All 14 rows missing both `item_code` and `estimated_unit_price` matched existing items (e.g., `PR-26-00047/1` "eot crane 5 ton" $\to$ `ITM-1071`, `PR-26-00039/1` "monitor 24\"" $\to$ `ITM-1057`). Therefore, they are priced via standard valuation (contract rate $\to$ PO price in 365 days $\to$ standard price).
   - Exactly 2 rows were confirmed as genuinely new items not in `item_master`:
     - `PR-26-00170/1`: "Drinking water purifier 50 LPH" (Estimated unit price: ₹1,41,100).
     - `PR-26-00171/1`: "Ultrasonic thickness gauge" (Estimated unit price: ₹1,05,600).
4. **New Item Handling:**
   - Always routed to `NEW_ITEM_SOURCING`.
   - Never clubbed with any other line.
   - Valued at $\text{quantity} \times \text{estimated\_unit\_price}$.
   - Never provided preferred or category supplier suggestions (Clause 6.4: *"New items get no suggestions: the buyer finds suppliers"*).
   - If a genuinely new item has missing or $\le 0$ estimated unit price, it is marked `NOT_PROCESSED` with reason: `"New item with missing estimated unit price cannot be valued."`

---

## 2. Invalid Plant Handling (PR-26-00173/1)

### 2.1 Ambiguity & Observation
Line `PR-26-00173/1` specifies plant `PUN2`. `master_data/plants.csv` defines only `PUN1` (Bhosari) and `CHK1` (Chakan).

### 2.2 Engineering Decision
- The application **does not silently reassign** `PUN2` to `PUN1`.
- Silently guessing plant locations in manufacturing causes misrouted deliveries and incorrect inventory accounting.
- `PR-26-00173/1` is marked as `route = NOT_PROCESSED` with explanation: `"Invalid plant PUN2. Only PUN1 and CHK1 are valid."`

---

## 3. Rate Contracts & Ceiling Consumption (Section 4)

### 3.1 PDF-Only Contracts (`RC-2026-031` & `RC-2026-033`)
- `contract_register.csv` reflects register status as of 31 October 2026.
- Direct examination of signed PDFs revealed two additional binding contracts:
  1. `RC-2026-031`: Pneumatic Point (`S021`), valid `2026-11-15` to `2027-11-14`, Cap: ₹20,00,000, Consumed: ₹0.
  2. `RC-2026-033`: Infoline Systems (`S035`), valid `2026-11-20` to `2027-11-19`, Cap: ₹50,00,000, Consumed: ₹0.
- Both contracts are ingested into the database and become active strictly on their respective start dates.

### 3.2 Blocked Supplier Contract Disqualification (`RC-2026-005`)
- Contract `RC-2026-005` in `contract_register.csv` is with `S004` (Metalink Alloys).
- In `supplier_master.csv`, `S004` has status `Blocked`.
- Policy Clause 4.1 mandates: *"A rate contract applies to a requirement if... the contract supplier is Active in the supplier master"*, and Rule 5.7 states: *"Blocked or Inactive suppliers must never receive a PO or be suggested for a sourcing event."*
- Consequently, `RC-2026-005` is disqualified from direct PO award. Requirements for covered items (`ITM-1006`, `ITM-1007`) route to RFQ/RFP quotes.

### 3.3 Dynamic Ceiling Consumption & Order of Evaluation
- Contracts consume ceiling dynamically in requirement date order ($T_{req}$ = creation timestamp of requirement's first line).
- If multiple contracts cover the item and have sufficient remaining ceiling, the lowest-rate contract is selected (Clause 4.3).
- If all applicable contracts are exhausted, the lowest applicable contract rate is used for valuation (Clause 3.1a), but the exhausted contract is not awarded; the requirement falls through to subsequent rules (RFQ/RFP).

---

## 4. Preferred Supplier Ranking Formula (Section 6)

### 4.1 Eligibility Window (548 Days)
Under Clause 6.1, a supplier is eligible if Active and either:
1. Holds $\ge 1$ purchase order for the item within 548 days before requirement date, OR
2. Holds a contract covering the item that started on or before the date (even if expired).

### 4.2 Scoring Formula & Normalization
The formula is deterministic, explainable, and normalized:

$$\text{Score} = 0.35 \times \frac{\text{POs}_{548}}{\max(\text{POs}_{548}, 1)} + 0.25 \times \text{Recency} + 0.15 \times \text{Contract} + 0.15 \times \frac{\text{OnTime}\%}{100} + 0.10 \times \frac{\text{Quality}}{5.0}$$

- **Frequency (35%):** Ratio of supplier's item POs in 548 days to the highest PO count among candidates.
- **Recency (25%):**
  - $1.0$ if latest PO $\le 90$ days.
  - $0.5$ if latest PO between $91$ and $365$ days.
  - $0.0$ if latest PO between $366$ and $548$ days.
- **Contract History (15%):** $1.0$ if supplier has held/holds a contract covering the item, else $0.0$.
- **On-Time Delivery (15%):** Normalized as $\frac{\text{on\_time\_pct}}{100}$.
- **Quality Rating (10%):** Normalized as $\frac{\text{quality\_rating}}{5.0}$.

### 4.3 Tie-Breaking
When scores match within $0.0001$, tie-breaking follows:
1. Higher on-time delivery percentage (`on_time_pct`).
2. Higher quality rating (`quality_rating`).

### 4.4 Category Sourcing Suggestions (Section 6.4)
When preferred suppliers are fewer than the required quota (3 for RFQ, 5 for RFP/Capex), suggestions are topped up from Active category suppliers sorted by balanced composite metric:

$$\text{Category Score} = 0.5 \times \frac{\text{OnTime}\%}{100} + 0.5 \times \frac{\text{Quality}}{5.0}$$

This exactly replicates the suggestions in Worked Examples 9, 10, 11, and 12.

---

## 5. Worked Example 11 Discrepancy Note

### 5.1 Observation
Worked Example 11 (`PR-26-00100/1`, `ITM-1034`, value ₹20,46,494) specifies route `RFP`. Rule 5.6 requests "Suggest 5 suppliers". However, the example output lists only four suppliers: `S020, S017, S019, S018`.

### 5.2 Resolution
In `supplier_master.csv`, only four Active suppliers exist that either have history for `ITM-1034` or list `Electrical Spares` category. All other suppliers are in different categories or Blocked (`S011`). As directed by Master Prompt Section 12, the engine **never invents a fake fifth supplier** and returns all available eligible suppliers (4).

---

## 6. Purchase Order Consolidation (Section 7)

- Requirements ending in PO are consolidated into a single PO ID if:
  1. Same supplier ID.
  2. Same plant (`PUN1` or `CHK1`).
  3. Same route (`CONTRACT_PO`, `SPOT_PO`, `EMERGENCY_PO`).
  4. Raised within 24.0 hours of the **first requirement on that PO** (measured from creation time of each requirement's first line).
- Requirements retain their unique `group_id` while sharing the consolidated `po_id`.
- Sourcing requests are never consolidated.

---

## 7. CSV Export Schema Definition

The preferred supplier CSV export format is:
`item_code,rank,supplier_id,reference_price,top_3`

- `reference_price`: Most recent PO price in 548 days; if none, latest contract rate.
- `top_3`: Boolean string (`true` if $\text{rank} \le 3$, else `false`), providing immediate visibility into preferred supplier tiering.
