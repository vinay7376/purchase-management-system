# Architectural Decisions & Business Judgments (`DECISIONS.md`)

**Project:** Corvo Engineering Autonomous Procurement Engine  
**Author / Candidate:** Vinay Pal (Full-Stack Engineering Candidate)  
**Task:** Cantill.ai Full-stack Intern Coding Challenge (Round 1)  

This document records the specific business judgments, policy ambiguities, edge case treatments, scoring formulations, and data reconciliation decisions I made while implementing the Corvo Engineering procurement engine.

---

## 1. Item Matching & Catalog Resolution (Clause 1.1 & 1.2)

### 1.1 The Ambiguity in the Data
While auditing `sample_pr_batch.csv`, I discovered that:
- **39 PR lines had no `item_code`**.
- Of these 39 lines, **14 lines also had no `estimated_unit_price`**.

If a naive system immediately classified every line without an `item_code` as a "New Item", 14 legitimate requisitions would fail valuation because they lacked an estimated unit price.

### 1.2 My Engineering Decision
1. **Catalog Matching Precedes New Item Classification:**
   Before marking any line as `NEW`, the description is normalized and matched against all 73 catalog items in `item_master.csv`.
2. **Abbreviation Expansion & Noise Token Stripping:**
   - Common shop-floor abbreviations are expanded: `brg` $\to$ `ball bearing`, `pneu` $\to$ `pneumatic`, `hyd` $\to$ `hydraulic`, `welding rod` $\to$ `welding electrode`, `monitor 24"` $\to$ `24 inch monitor`.
   - Requisition noise tokens (`for maintenance`, `urgent`, `as per sample`, `repeat`, `nos`, `kg`, etc.) are stripped.
   - I implemented token intersection and Jaccard similarity scoring with a confidence threshold $\ge 0.8$.
3. **Data Audit Outcome:**
   - **37 of the 39 lines** successfully matched catalog items with 100% precision.
   - All 14 lines missing both `item_code` and `estimated_unit_price` were matched to existing catalog items (e.g., `PR-26-00047/1` "eot crane 5 ton" $\to$ `ITM-1071`, `PR-26-00039/1` "monitor 24\"" $\to$ `ITM-1057`). These items are valued through the standard hierarchy (contract rate $\to$ PO price in 365 days $\to$ standard price).
   - **Exactly 2 lines** were confirmed as genuinely new items not in `item_master`:
     - `PR-26-00170/1`: "Drinking water purifier 50 LPH" (Estimated unit price: ₹1,41,100).
     - `PR-26-00171/1`: "Ultrasonic thickness gauge" (Estimated unit price: ₹1,05,600).
4. **New Item Handling:**
   - Genuinely new items are routed to `NEW_ITEM_SOURCING` under Clause 1.2.
   - They are never clubbed with any other line.
   - In accordance with Clause 6.4 (*"New items get no suggestions: the buyer finds suppliers"*), they receive no suggested suppliers (`suggested_supplier_ids` = `""`).
   - If a genuinely new item is missing its estimated unit price, it cannot be valued and is routed to `NOT_PROCESSED` with an explicit explanation.

---

## 2. Invalid Plant Handling (`PR-26-00173/1`)

### 2.1 The Ambiguity
Line `PR-26-00173/1` specifies plant code `PUN2`. However, `master_data/plants.csv` defines only two valid manufacturing plants:
- `PUN1` (Bhosari Plant)
- `CHK1` (Chakan Plant)

### 2.2 My Engineering Decision
- In an automated manufacturing supply chain, **silently reassigning an unrecognized plant code (`PUN2` $\to$ `PUN1`) is dangerous**: it causes misrouted logistics, incorrect plant inventory accounting, and GST compliance errors.
- Therefore, my engine flags `PR-26-00173/1` with `route = NOT_PROCESSED` and the explicit reason:  
  `"Invalid plant PUN2. Only PUN1 and CHK1 are valid."`

---

## 3. Rate Contracts & Dynamic Ceiling Tracking (Section 4)

### 3.1 Signed PDF-Only Contracts (`RC-2026-031` & `RC-2026-033`)
- `contract_register.csv` represents the register as of 31 October 2026.
- Inspection of the contract PDF directory revealed two binding signed contracts:
  1. `RC-2026-031`: Pneumatic Point (`S021`), valid `2026-11-15` to `2027-11-14`, Cap: ₹20,00,000, Consumed: ₹0.
  2. `RC-2026-033`: Infoline Systems (`S035`), valid `2026-11-20` to `2027-11-19`, Cap: ₹50,00,000, Consumed: ₹0.
- I ingested both contracts into the system. The engine activates them strictly on their start dates. (For example, `PR-26-00045/1` raised on 2026-11-16 for `ITM-1036` correctly matches `RC-2026-031` as demonstrated in Worked Example 2).

### 3.2 Blocked Supplier Contract Disqualification (`RC-2026-005`)
- Contract `RC-2026-005` in `contract_register.csv` covers items with supplier `S004` (Metalink Alloys).
- In `supplier_master.csv`, `S004` has status `Blocked`.
- Policy Clause 4.1 explicitly states: *"A rate contract applies to a requirement if... the contract supplier is Active in the supplier master"*, and Rule 5.7 mandates: *"Blocked or Inactive suppliers must never receive a PO or be suggested for a sourcing event."*
- Therefore, my engine disqualifies `RC-2026-005` from direct PO award. Requirements for covered items (`ITM-1006`, `ITM-1007`) route to RFQ/RFP quotes, ensuring zero compliance violations.

### 3.3 Dynamic Ceiling Consumption & Order of Evaluation
- Contracts consume their monetary ceiling dynamically in requirement date order ($T_{req}$ = creation timestamp of the requirement's first line).
- When multiple contracts cover the item and have sufficient room, the contract with the lowest rate is selected (Clause 4.3).
- If all applicable contracts are exhausted, the lowest applicable contract rate is still used for requirement valuation (Clause 3.1a), but the requirement falls through to subsequent policy rules (RFQ/RFP).

---

## 4. Multi-Factor Preferred Supplier Ranking Formulation (Section 6)

### 4.1 Eligibility Window (548 Days)
Under Clause 6.1, an active supplier is eligible for ranking for an item if:
1. It holds $\ge 1$ purchase order for the item within 548 days before the requirement date, OR
2. It holds a contract covering the item that started on or before the requirement date (even if expired).

### 4.2 Scoring Formula & Normalization
The policy guidelines require balancing frequency, recency, contract status, on-time delivery, and quality. I designed the following normalized, explainable formula:

$$\text{Composite Score} = 0.35 \times \left(\frac{\text{POs}_{548}}{\max(\text{POs}_{548}, 1)}\right) + 0.25 \times \text{Recency} + 0.15 \times \text{Contract} + 0.15 \times \left(\frac{\text{OnTime}\%}{100}\right) + 0.10 \times \left(\frac{\text{Quality}}{5.0}\right)$$

- **Frequency (35%):** Ratio of supplier's item PO count in 548 days to the maximum PO count among eligible candidates.
- **Recency (25%):**
  - $1.0$ if latest PO $\le 90$ days.
  - $0.5$ if latest PO between $91$ and $365$ days.
  - $0.0$ if latest PO between $366$ and $548$ days.
- **Contract History (15%):** $1.0$ if supplier has held/holds a contract covering the item, else $0.0$.
- **On-Time Delivery (15%):** Normalized as $\frac{\text{on\_time\_pct}}{100}$.
- **Quality Rating (10%):** Normalized as $\frac{\text{quality\_rating}}{5.0}$.

### 4.3 Deterministic Tie-Breaking
When composite scores match within $0.0001$, ties are broken deterministically by:
1. Higher on-time delivery percentage (`on_time_pct`).
2. Higher quality rating (`quality_rating`).

### 4.4 Category Sourcing Suggestions (Section 6.4)
When eligible preferred suppliers are fewer than the required quote quota (3 for RFQ, 5 for RFP/Capex), suggestions are topped up from active suppliers in the same category, ranked by a balanced delivery & quality composite metric:

$$\text{Category Score} = 0.5 \times \left(\frac{\text{OnTime}\%}{100}\right) + 0.5 \times \left(\frac{\text{Quality}}{5.0}\right)$$

This exactly reproduces the sourcing suggestions in Worked Examples 9, 10, 11, and 12.

---

## 5. Worked Example 11 Discrepancy Note

### 5.1 Observation
Worked Example 11 (`PR-26-00100/1`, `ITM-1034`, value ₹20,46,494) routes to `RFP`. Rule 5.6 specifies: *"Suggest 5 suppliers"*. However, the example output lists only four suppliers: `S020, S017, S019, S018`.

### 5.2 Resolution & Business Judgment
Upon querying `supplier_master.csv`, exactly four Active suppliers exist that either have history for `ITM-1034` or list category `Electrical Spares`. All other suppliers in the database belong to other categories or are `Blocked` (`S011`).

As an engineer, **I decided never to fabricate a fake fifth supplier or recommend an unqualified supplier from an unrelated category.** Returning all 4 qualified active suppliers preserves procurement integrity and matches Worked Example 11.

---

## 6. Purchase Order Consolidation (Section 7)

Requirements ending in a PO are consolidated into a single PO ID if:
1. Same supplier ID.
2. Same manufacturing plant (`PUN1` or `CHK1`).
3. Same route (`CONTRACT_PO`, `SPOT_PO`, `EMERGENCY_PO`).
4. Raised within **24.0 hours of the first requirement on that PO** (measured from creation time of each requirement's first line).

Requirements retain their unique `group_id` while sharing the consolidated `po_id`. Sourcing requests are never consolidated.

---

## 7. CSV Export Schema & Blind Test Deliverables

The preferred supplier CSV export schema strictly implements the Blind Test instruction:
`item_code, rank, supplier_id, reference_price` (top 3 per item)

- **Columns:** `item_code`, `rank`, `supplier_id`, `reference_price`.
- **Top 3 Filtering:** Exactly ranks 1, 2, and 3 are retained for each catalog item.
- **Reference Price:** Most recent PO unit price in 548 days; if none, latest contract rate.
- **Exclusions:** Blocked and Inactive suppliers are excluded.

---

## 8. Blind Test Execution & Policy Amendment No. 1 (v5.1)

### 8.1 Overview & Compliance
The blind test was received on 19 November 2026 with:
- `hidden_pr_batch.csv`: 190 PR lines raised between 23 Nov and 11 Dec 2026.
- `Corvo_Policy_Amendment_1_v5.1.pdf`: Amendment No. 1 effective 1 December 2026, approved by CFO on 20 November 2026.

**Strict Code Freeze Adherence:** In full compliance with challenge rules (*"Do NOT change your code... any code change after 10:00 AM will not be scored"*), **zero application code changes** were made to the procurement engine or API after the 10:00 AM cutoff. Policy v5.1 was uploaded, versioned, and activated purely as data within the data-driven engine.

### 8.2 Policy Amendment No. 1 Engineering Translation
1. **Change A1 (Packaging Spot Limit):**
   - For items in the `Packaging` category, the spot PO limit under Rule 5.4 was reduced from ₹2,00,000 to ₹1,00,000.
   - Packaging requirements $\ge ₹1,00,000$ must be sourced.
   - Implemented via Rule `RULE_5.4_PKG` (Priority 6) for `category == 'Packaging'` with threshold $< 1,00,000$, and Rule `RULE_5.4` (Priority 7) for `category != 'Packaging'` with standard threshold $< 2,00,000$.
2. **Change A2 (RFP Threshold Reduction):**
   - Formal RFP threshold in Rules 5.5 and 5.6 was reduced from ₹10,00,000 to ₹8,00,000.
   - Sourcing requirements $< ₹8,00,000 \to$ RFQ (suggest 3 suppliers); requirements $\ge ₹8,00,000 \to$ RFP (suggest 5 suppliers).
3. **Change A3 (Rule 5.2A Chakan Electrical Safety):**
   - Evaluated immediately after Rule 5.2 (Contract PO).
   - If plant is `CHK1` and category is `Electrical Spares` with requirement value $\ge ₹50,000$: must be sourced via RFQ ($< ₹8,00,000$) or RFP ($\ge ₹8,00,000$), even if qualifying for emergency or spot PO.
   - Valid contract POs under Rule 5.2 are preserved as explicitly permitted by the amendment.

### 8.3 Data Edge Cases Identified in Hidden Batch
1. **Invalid Manufacturing Plant (`PR-26-00675/1`):**
   - Line `PR-26-00675/1` specifies plant `PUN2`.
   - As established in Corvo's master policy and plant hierarchy, only `PUN1` (Bhosari) and `CHK1` (Chakan) are valid operating plants.
   - The engine safely routes this line to `NOT_PROCESSED` with explicit reason: *"Invalid plant PUN2. Only PUN1 and CHK1 are valid."*
2. **New Items Sourcing (`NEW_ITEM_SOURCING`):**
   - Four lines in the hidden batch (`PR-26-00517`, `PR-26-00668`, `PR-26-00669`, `PR-26-00670`) represent new uncataloged items with user-provided estimated prices.
   - The engine correctly routes them to `NEW_ITEM_SOURCING` under Clause 1.2, unclubbed, without auto-suggested suppliers (Clause 6.4).

### 8.4 Policy v5.0 vs v5.1 Decision Diff Summary (24 Shifts)
Processing the identical 190 lines under Policy v5.0 (`vinay__run1.csv`) versus Policy v5.1 (`vinay__run2.csv`) yields exactly **24 decision shifts**:
- **10 Packaging Spot POs shifted to RFQ:** Lines `PR-26-00603`, `00604`, `00605`, `00606`, `00607`, `00608`, `00610`, `00671`, `00672`, `00673` (values between ₹1,23,453 and ₹1,93,490) shifted from `SPOT_PO` to `RFQ` under Change A1.
- **8 Chakan Electrical Spares Spot POs shifted to RFQ:** Lines `PR-26-00611` through `PR-26-00618` (values between ₹80,491 and ₹1,63,137) shifted from `SPOT_PO` to `RFQ` under Rule 5.2A.
- **1 Chakan Electrical Spares Emergency PO shifted to RFQ:** Line `PR-26-00558/1` (value ₹1,81,850.40) shifted from `EMERGENCY_PO` to `RFQ` under Rule 5.2A ("even if qualifying for emergency PO").
- **5 High-Value Sourcing Lines shifted to RFP:** Lines `PR-26-00589`, `00622`, `00623`, `00625`, `00667` (values between ₹8,04,636 and ₹8,96,536) shifted from `RFQ` to `RFP` under Change A2 (RFP threshold reduced from 10L to 8L).

