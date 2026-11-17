# Architecture & Technical Approach (`APPROACH.md`)

**System Name:** Corvo Engineering Autonomous Procurement Engine  
**Author:** Senior Full-Stack Procurement Engineering Team  

---

## 1. Architectural Philosophy: Policy as Data

The foundational architectural principle of this system is **complete separation of procurement policy from executable code**:

```
┌────────────────────────────────┐
│   Procurement Policy Document  │  (PDF / Text Amendments)
└───────────────┬────────────────┘
                │
                ▼ [AI & Deterministic Text Extractor]
┌────────────────────────────────┐
│   Structured JSON Policy Rule  │  (MongoDB Policy Collection)
│   - Condition Trees (AST)      │  - Priority Order (1..N)
│   - Generic Operators (==, <)  │  - Effective Dates & Status
└───────────────┬────────────────┘
                │
                ▼ [Deterministic JSONLogic Evaluation Engine]
┌────────────────────────────────┐
│   Deterministic Decision Exec  │  (Zero Code Changes for New Rules/Plants)
│   - PR Clubbing                │  - Contract Ceiling Check
│   - Valuation Hierarchy        │  - PO Consolidation
└────────────────────────────────┘
```

### Why Hardcoded Policies Fail in Enterprise Procurement
Traditional procurement software embeds thresholds (`if (val < 200000)`) directly into controllers or service classes. When procurement amends thresholds or introduces plant-specific policies (e.g. Chakan plant emergency ceiling reduced to 300,000 INR), hardcoded architectures require code modifications, redeployment, and risk regressions.

In this application:
1. Every rule is a JSON document adhering to the `IRuleDefinition` schema.
2. Conditions are recursive Abstract Syntax Trees (`and`, `or`, `not`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `between`).
3. Adding a new rule for a specific plant (`plant == 'CHK1'`), category, or emergency threshold requires only inserting a new rule data object with an effective date.
4. Historical policies remain immutable; batches can be re-evaluated under Policy v5.0 or Policy v5.1 side-by-side.

---

## 2. AI Usage & Boundaries Inside the Application

AI is leveraged where natural language reasoning is optimal, but strictly isolated from mathematical and legal decision logic:

### 2.1 Conversational Employee PR Intake (`AIService.processChatIntake`)
- Replaces rigid, multi-page requisition forms with a human-like chat assistant.
- Extracts entities (`itemDescription`, `quantity`, `uom`, `plant`, `need_by_date`, `urgency`) from unstructured inputs.
- Identifies missing information and prompts the requester with targeted follow-up questions.
- Matches descriptions against catalog items with abbreviation expansion.
- Presents a final confirmation summary before creating the PR.
- **Safeguard:** Never hallucinates missing quantities, items, or plants. If unstated, marks as missing and asks.

### 2.2 Policy Amendment Translation (`AIService.parsePolicyAmendment`)
- Ingests natural language policy amendment text or extracted PDF text.
- Parses version numbers, effective dates, modified thresholds, and plant/category scopes.
- Generates structured JSON rules and diff summaries comparing old vs proposed rules.
- **Safeguard:** Unapproved amendments are stored in `PENDING_APPROVAL` status. They cannot activate or influence decisions without explicit human review and approval.

### 2.3 Deterministic Execution Guarantee
- **AI never makes the final procurement decision.**
- The final decision (`PO` vs `SOURCING_REQUEST`), route (`CONTRACT_PO`, `SPOT_PO`, etc.), supplier selection, and ceiling consumption are 100% deterministic, governed by the structured condition engine and policy hierarchy.

---

## 3. Core Engine Pipeline (Step-by-Step)

The decision engine runs through 7 sequential phases for every batch:

1. **Item Resolution (`ItemMatcher`):**
   - Direct item code lookup in `item_master`.
   - If missing, description normalization (cleaning abbreviations, stripping stop-words, token overlap + subset matching).
   - If unmatched, classified as `NEW` (`NEW_ITEM_SOURCING`).
2. **PR Clubbing (`PRClubber`):**
   - PR lines sorted by: (1) `created_at`, (2) `pr_no`, (3) `pr_line`.
   - Lines join existing requirements if: same resolved item, same plant, created within 14 calendar days of group's FIRST line, and need-by date within 7 days of group's FIRST line need-by date.
   - Joins the earliest qualifying group. Non-transitive comparisons.
   - Emergency escalation: if any line is Emergency, entire requirement becomes Emergency.
   - Invalid plants (`PUN2`) flagged as `NOT_PROCESSED`.
3. **Contract Ceiling Check (`ContractManager`):**
   - Resolves all active contracts covering the item valid on requirement date.
   - Excludes Blocked or Inactive suppliers (`S004`).
   - Includes PDF-only contracts (`RC-2026-031`, `RC-2026-033`) from their start dates.
   - Verifies dynamic ceiling room ($\text{consumed} + \text{required} \le \text{cap}$).
4. **Valuation (`DecisionService`):**
   - Unit price hierarchy: (a) Usable contract rate, or lowest contract rate if all exhausted; (b) Most recent PO price in 365 days; (c) Item standard price; (d) Estimated price for new items.
5. **Preferred Supplier Ranking (`SupplierRanker`):**
   - Evaluates active suppliers with PO in 548 days or contract.
   - Applies explainable scoring formula (Frequency 35%, Recency 25%, Contract 15%, On-Time 15%, Quality 10%).
   - Resolves reference price (latest PO in 548 days, or contract rate).
   - Tops up sourcing suggestions from category suppliers ranked by delivery & quality composite.
6. **Policy Rule Evaluation (`RuleEngine`):**
   - Evaluates active policy rules in ascending priority order.
   - Clause 5.1 (Capex) $\to$ 5.2 (Contract PO) $\to$ 5.3 (Emergency PO $\le$ 500k) $\to$ 5.4 (Spot PO $<$ 200k) $\to$ 5.5 (RFQ $<$ 1M) $\to$ 5.6 (RFP $\ge$ 1M).
7. **Purchase Order Consolidation (`POConsolidator`):**
   - Requirements ending in PO with same supplier, same plant, and same route raised within 24 hours of first requirement's first line are consolidated into one PO ID.

---

## 4. Security & Data Privacy Architecture

In compliance with the hiring assessment guidelines:
- **Zero Sensitive Data in Git:** `.gitignore` strictly ignores `Cantill_FullStack_Task_Kit/`, `*.pdf`, `*.csv` (except `!submission/*.csv`), `.env`, and local caches.
- **Private Data Seeding Mechanism:** Seeding scripts (`npm run seed` or `POST /api/data/seed`) run locally or via authorized API calls, ensuring the hosted instance can be seeded without pushing private CSV/PDF files to the public GitHub repository.
- **Persistent Data & Fallback:** Backend connects to MongoDB via `MONGODB_URI` with automatic zero-configuration fallback to `mongodb-memory-server` when running offline.

---

## 5. Verification & Testing Strategy

- Automated testing suite built using **Vitest**.
- **All 14 Worked Decisions** from `Worked_Examples.pdf` are tested as automated regression assertions against the actual sample batch.
- **All 3 Preferred Supplier Rankings** are verified down to individual supplier IDs, scores, and ranks.
- **Boundary Conditions Tested:** Exactly ₹200,000, ₹500,000, ₹1,000,000; exactly 14.0 days creation window; exactly 7.0 days need-by window; exactly 24.0 hours PO consolidation window.
- **Policy Amendment Dynamic Reprocessing:** Verified that an amendment alters decisions dynamically without application code modifications.
