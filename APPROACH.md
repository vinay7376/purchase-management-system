# Technical Approach & Architecture (`APPROACH.md`)

**Project:** Corvo Engineering Autonomous Procurement Decision Engine  
**Author / Candidate:** Vinay Pal (Full-Stack Engineering Candidate)  
**Submission For:** Cantill.ai Full-stack Intern Coding Challenge (Round 1)  
**Live Deployed App:** [https://purchase-management-system-ath6.onrender.com/](https://purchase-management-system-ath6.onrender.com/)  
**Public Repository:** [https://github.com/vinay7376/purchase-management-system.git](https://github.com/vinay7376/purchase-management-system.git)  

---

## 1. Core Architectural Philosophy: Policy as Data

The central engineering challenge of this task is building a system where **procurement rules, thresholds, and routing logic can be amended on the fly without changing or redeploying application code**.

```
┌──────────────────────────────────────────────┐
│       Procurement Policy Document            │ (Text Amendment / Signed PDF)
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│        AI & NLP Entity Extractor             │ (Translates text to Structured AST)
│        - Version & Effective Dates           │
│        - Plain-language Rule Diff            │
└──────────────────────┬───────────────────────┘
                       │
                       ▼ (Human Approval Required)
┌──────────────────────────────────────────────┐
│        MongoDB Policy Document               │ (Active Rule Hierarchy)
│        - Rule Priority Order (1..N)          │
│        - Nested Abstract Syntax Tree (AST)   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│     Deterministic Decision Engine            │ (100% Code-Driven, Zero Hallucination)
│     - Item Normalization & Matching          │
│     - 14d/7d Non-Transitive PR Clubbing      │
│     - Dynamic Contract Ceiling Deduction     │
│     - Multi-Factor Preferred Supplier Scoring│
│     - 24-Hour PO Consolidation               │
└──────────────────────────────────────────────┘
```

### Why Hardcoded Policies Fail
In conventional enterprise software, developers embed business thresholds (`if (groupValue < 200000 && isEmergency)`) directly into backend route handlers or service logic. This fails in real manufacturing environments:
- When a Chief Procurement Officer amends emergency limits for a specific plant (e.g. Chakan reduced to ₹300,000 INR), hardcoded systems require code refactoring, QA testing, and redeployment.
- In this architecture, **every rule is stored as a declarative JSON document with a condition tree**.
- The `RuleEngine` traverses rules in ascending priority order (1..N), evaluating generic operators (`==`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `not_in`, `between`, `and`, `or`, `not`) against the requirement context.
- Historical policies remain immutable. New versions become active strictly from their effective dates upon human approval.

---

## 2. Tools & AI Disclosure (As Required by Task Brief)

As mandated by Section 7 of the Task Brief (*"AI tools are allowed, for coding and inside your app. Tell us what you used in APPROACH.md"*), here is a complete and transparent breakdown:

### 2.1 AI Tools Used for Coding & Prototyping
- **AI Coding Assistants:** I used AI assistants (Antigravity / LLM-based coding tools) to rapidly scaffold boilerplate code—such as Tailwind UI view components, Mongoose model schemas, and drafting initial regular expressions for parsing unstructured contract PDFs.
- **Test Generation Assistance:** I leveraged AI to author comprehensive Vitest assertion suites based on the 14 worked examples from `Worked_Examples.pdf` and edge cases (threshold boundaries, PR clubbing time windows, invalid plants).
- **Architectural Control & Ownership:** While AI assisted with rapid typing and boilerplate generation, **I designed the end-to-end architecture, defined the mathematical scoring formulas, implemented the non-transitive clubbing algorithms, debugged the BOM-encoding edge cases, and manually verified every single test output against the Corvo Procurement Policy v5.0.**

### 2.2 AI Usage Inside the Application Runtime
AI is used inside the running app exclusively at the natural language boundary, strictly isolated from legal and mathematical decision-making:
1. **Conversational Employee PR Intake (`AIService.processChatIntake`):**
   - Extracts procurement entities (`itemDescription`, `quantity`, `uom`, `plant`, `need_by_date`, `urgency`) from unstructured conversational messages.
   - Detects missing information and asks targeted follow-up questions instead of guessing.
   - Normalizes descriptions against catalog items (`ItemMatcher`).
2. **Policy Amendment Ingestion (`AIService.parsePolicyAmendment`):**
   - Reads unstructured amendment text or PDF files, extracts the new version number, effective date, and altered rule thresholds, and generates draft AST rules and visual diffs.
   - **Critical Safeguard:** The AI cannot activate policies on its own. Draft policies are created in `PENDING_APPROVAL` status and require explicit human review and approval before becoming active.
3. **Deterministic Decision Guarantee:**
   - **AI never makes the procurement decision (`PO` vs `SOURCING_REQUEST`).** The route, supplier selection, pricing, ceiling deduction, and PO consolidation are 100% deterministic, governed strictly by the active policy AST.

---

## 3. End-to-End Decision Pipeline

For every batch of purchase requisitions, the backend executes 7 sequential phases:

```
[Raw PR Lines] 
   │
   ▼ Phase 1: Item Resolution (ItemMatcher)
   │   - Exact code match or fuzzy description matching with abbreviation expansion
   │   - Unmatched lines marked as NEW (Clause 1.2)
   │
   ▼ Phase 2: PR Clubbing (PRClubber)
   │   - Deterministic sort: created_at -> pr_no -> pr_line
   │   - 14-day creation window + 7-day need-by window compared to group's FIRST line
   │   - Same item + same plant; emergency flag escalates entire requirement
   │   - Invalid plant (PUN2) flagged as NOT_PROCESSED
   │
   ▼ Phase 3: Contract Ceiling Tracking (ContractManager)
   │   - Active contracts valid on requirement date (T_req)
   │   - Blocked supplier (S004) disqualified; PDF-only contracts included
   │   - Dynamic ceiling deduction in requirement-date order
   │
   ▼ Phase 4: Valuation Hierarchy (DecisionService)
   │   - (a) Usable contract rate, or lowest contract rate if all exhausted
   │   - (b) Most recent PO price in 365 days
   │   - (c) Item standard price
   │   - (d) Estimated price for new items
   │
   ▼ Phase 5: Preferred Supplier Ranking (SupplierRanker)
   │   - 548-day window: Frequency (35%), Recency (25%), Contract (15%), Delivery (15%), Quality (10%)
   │   - Category top-ups for RFQ (3 quotes) and RFP (5 quotes)
   │
   ▼ Phase 6: Policy Rule Evaluation (RuleEngine)
   │   - Evaluates active policy AST in priority order:
   │     Capex (5.1) -> Contract PO (5.2) -> Emergency PO (5.3) -> Spot PO (5.4) -> RFQ (5.5) -> RFP (5.6)
   │
   ▼ Phase 7: Purchase Order Consolidation (POConsolidator)
       - Same supplier, same plant, same route within 24 hours of first line consolidated into single PO ID
```

---

## 4. Technology Stack & Monorepo Architecture

- **Backend:** Node.js, Express.js, JavaScript (ES6+ with ES Modules), Mongoose, MongoDB.
  - Automatically connects to remote MongoDB Atlas in production (`process.env.MONGODB_URI`).
  - Automatic zero-configuration fallback to embedded `mongodb-memory-server` for local offline test runs.
  - DNS SRV resolver configured with Google/Cloudflare upstream DNS to ensure seamless resolution across all operating systems.
- **Frontend:** React 18, Vite, JavaScript (ES6+), JSX, Tailwind CSS, Lucide Icons.
  - Responsive Midnight Sapphire UI theme designed for procurement operations.
  - Single Unified Service: In production, the Express backend serves both the REST API and the compiled React single-page application from a single entry point.
- **File Processing:** `csv-parse`, `csv-stringify`, `pdf-parse`, `multer`.
- **Testing:** Vitest with 28 automated regression tests covering all 14 worked decisions, boundary conditions, and policy amendments.

---

## 5. Security & Submission Compliance

- **Zero Sensitive Data in Git:** In accordance with the challenge guidelines, all task kit files (`master_data/`, `contracts/`, `pr_batches/`, `*.pdf`, `*.csv`) are protected by `.gitignore`.
- **Whitelisted Submissions:** Only `!submission/*.csv` and documentation are tracked.
- **Production Persistence:** The hosted deployment on Render is connected to MongoDB Atlas, ensuring that all policies, contracts, batches, audit logs, and buyer overrides persist reliably across server restarts.
