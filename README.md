# Corvo Engineering — Autonomous Policy-Driven Procurement System

[![Live Demo](https://img.shields.io/badge/Hosted%20App-Render%20Live-brightgreen.svg)](https://purchase-management-system-ath6.onrender.com/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/vinay7376/purchase-management-system.git)
[![Vitest](https://img.shields.io/badge/tests-28%20passed-brightgreen.svg)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B%20%2F%20ESM-yellow.svg)]()
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)]()
[![Node](https://img.shields.io/badge/Node-20%2B-green.svg)]()
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)]()

**Candidate / Author:** Vinay Pal (Full-Stack Engineering Candidate)  
**Task:** Cantill.ai Full-stack Intern Coding Challenge (Round 1)  
**Hosted Application:** [https://purchase-management-system-ath6.onrender.com/](https://purchase-management-system-ath6.onrender.com/)  
**Public Repository:** [https://github.com/vinay7376/purchase-management-system.git](https://github.com/vinay7376/purchase-management-system.git)  

---

## 1. Executive Summary

Corvo Engineering Pvt Ltd operates industrial manufacturing facilities at **PUN1 (Bhosari)** and **CHK1 (Chakan)**. Every day, employees across the factories raise purchase requisitions (PRs). 

This production-grade full-stack web application completely automates the PR-to-PO procurement pipeline according to **Corvo Procurement Policy Version 5.0**:
- **Conversational Chat Intake (not forms):** Requesters type natural language requests (e.g., *"Need 200 nitrile gloves for Chakan by next Friday"*). The assistant extracts entities, matches catalog items, asks targeted follow-ups for missing details, and confirms before PR creation.
- **Policy as Data (Zero Code Change):** Procurement rules, thresholds, and routing logic are stored as declarative Abstract Syntax Trees (AST) in MongoDB. When a policy amendment is uploaded (via PDF or plain text), the system parses the changes, shows a plain-language rule comparison diff, and activates the new version upon human approval without touching application code.
- **Deterministic Decision Engine:** Implements non-transitive PR clubbing (14-day creation / 7-day need-by windows), dynamic contract ceiling deduction ($T_{req}$ order), valuation hierarchy, and deterministic policy hierarchy evaluation (Capex, Contract PO, Emergency PO, Spot PO, RFQ, RFP).
- **Multi-Factor Preferred Supplier Ranking:** Computes explainable rankings across a 548-day window based on purchase frequency (35%), recency (25%), contract history (15%), on-time delivery (15%), and quality rating (10%).
- **24-Hour Purchase Order Consolidation:** Consolidates eligible requirements sharing supplier, plant, and route within 24.0 hours into single PO IDs.
- **Buyer Governance Workspace:** Complete inspection cockpit with KPI telemetry, clause citations, approvals, auditable overrides with mandatory written justifications, and tamper-evident audit logs.

---

## 2. Technology Stack

- **Backend:** Node.js, Express.js, JavaScript (ES6+ with ES Modules), Mongoose, MongoDB Atlas.
  - Production persistent storage via MongoDB Atlas (`process.env.MONGODB_URI`).
  - Automatic zero-configuration fallback to embedded `mongodb-memory-server` for local offline test runs.
  - DNS SRV resolver configured with Google/Cloudflare upstream DNS to ensure cross-platform connectivity.
- **Frontend:** React 18, Vite, JavaScript (ES6+), JSX, Tailwind CSS, Lucide Icons.
  - Single Unified Service: The Express backend statically serves the compiled React single-page application from `frontend/dist`.
- **File Processing:** `csv-parse`, `csv-stringify`, `pdf-parse`, `multer`.
- **Testing:** Vitest (28 automated regression tests covering all 14 worked decisions, preferred rankings, boundary conditions, and amendments).
- **Containerization:** Multi-stage `Dockerfile` and `docker-compose.yml`.

---

## 3. Quick Start (One-Command Setup)

### Prerequisites
- Node.js $\ge 18$
- npm $\ge 9$
- (Optional) Docker & Docker Compose

### Option A: Local Run (Node & npm)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vinay7376/purchase-management-system.git
   cd purchase-management-system
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Build frontend production bundle:**
   ```bash
   npm run build:all
   ```

4. **Seed database (from private local kit or API):**
   ```bash
   npm --prefix backend run seed
   ```

5. **Start application:**
   ```bash
   npm start
   ```
   Open `http://localhost:5000` in your browser. The backend serves both the REST API and the compiled React UI!

---

### Option B: Docker Compose (One Command)

```bash
docker compose up --build
```
Access the application at `http://localhost:5000`.

---

## 4. Automated Test Suite (28 / 28 Passed)

Run the full automated test suite:
```bash
npm test
```
Or directly within the backend directory:
```bash
cd backend
npm test
```

### Test Coverage Highlights:
- **`tests/worked_examples.test.js` (17 tests — 100% passed):**
  - All 14 worked decisions from `Worked_Examples.pdf` verified against actual kit data.
  - All 3 preferred supplier rankings (`ITM-1048`, `ITM-1036`, `ITM-1016`) verified down to individual supplier IDs, scores, and ranks.
- **`tests/boundary_and_rules.test.js` (8 tests — 100% passed):**
  - Exact ₹200,000 threshold boundary (₹199,999 Spot PO vs ₹200,000 RFQ).
  - Exact ₹500,000 emergency threshold boundary (₹500,000 Emergency PO vs ₹500,001 RFQ).
  - Exact ₹1,000,000 RFP threshold boundary.
  - Exactly 14.0 days creation date PR clubbing limit.
  - Exactly 7.0 days need-by date PR clubbing limit.
  - Exactly 24.0 hours PO consolidation window.
  - Invalid plant rejection (`PUN2` routed to `NOT_PROCESSED`).
  - Missing price on new items routed to `NOT_PROCESSED`.
- **`tests/policy_amendment.test.js` (3 tests — 100% passed):**
  - Parsing natural language amendment text into structured rules.
  - Verified decision change between Policy v5.0 and Policy v5.1 for the same requirement without application code changes.
  - Plant isolation (`CHK1` emergency limit adjusted to ₹300k while `PUN1` maintains baseline rules).

---

## 5. REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check and uptime status |
| `POST` | `/api/process-batch` | Accepts PR batch CSV (`file` or `csvData`), evaluates active policy, returns decisions JSON & CSV |
| `POST` | `/api/export-decisions` | Exports decision records to 13-column CSV |
| `POST` | `/api/chat/intake` | Conversational employee PR message processor & entity extractor |
| `POST` | `/api/chat/create-pr` | Creates a confirmed Purchase Requisition from conversational intake |
| `GET` | `/api/policies` | Lists all policy versions with effective dates and statuses |
| `POST` | `/api/policies/upload-amendment` | Parses amendment PDF or text into structured draft rules |
| `POST` | `/api/policies/:version/approve` | Approves and activates policy version from effective date |
| `POST` | `/api/policies/:version/reject` | Rejects proposed policy amendment |
| `GET` | `/api/contracts` | Lists all rate contracts with live ceiling consumption |
| `POST` | `/api/contracts/upload-pdf` | Automatically extracts and registers signed contract PDF |
| `GET` | `/api/suppliers` | Lists suppliers with category and status filters |
| `GET` | `/api/suppliers/preferred/:itemCode` | Computes preferred ranking for item as of chosen date |
| `GET` | `/api/suppliers/export-preferred` | Exports preferred supplier CSV (`item_code,rank,supplier_id,reference_price,top_3`) |
| `GET` | `/api/buyer/dashboard` | Returns executive KPI telemetry |
| `GET` | `/api/buyer/requirements` | Lists clubbed requirements with filters |
| `POST` | `/api/buyer/requirements/:id/approve` | Approves requirement decision |
| `POST` | `/api/buyer/requirements/:id/override` | Overrides decision with mandatory written reason |
| `GET` | `/api/buyer/audit-logs` | Retrieves full governance audit trail |
| `POST` | `/api/data/seed` | Seeds database from local kit or payload |

---

## 6. Output CSV Formats

### 13-Column Decisions CSV (Section 4 Schema)
```csv
pr_no,pr_line,resolved_item_code,group_id,po_id,decision,route,supplier_id,unit_price,group_value_inr,suggested_supplier_ids,policy_version,reason
```

### Preferred Supplier CSV (Section 3 Schema)
```csv
item_code,rank,supplier_id,reference_price,top_3
```

---

## 7. Blind Test Execution Workflow

During the 2-hour blind test on **Thursday 19 November**:

1. **Run 1 (Process Blind PR Batch under Policy v5.0):**
   - Upload the new test PR batch CSV in the **Batch Processing & Export** view (or use `POST /api/process-batch`).
   - Click **Download Decisions CSV**.
   - Save file to the `submission/` folder as `vinay__run1.csv`.
   - *CLI Alternative:*
     ```bash
     node backend/src/scripts/exportDecisions.js path/to/blind_pr_batch.csv 5.0 submission/vinay__run1.csv
     ```

2. **Run 2 (Upload Policy Amendment & Reprocess):**
   - Navigate to the **Policy Management & Versioning** view in the UI.
   - Upload the policy amendment PDF or paste the amendment text into **Propose Policy Amendment**.
   - Review the rule comparison diff.
   - Click **Approve & Activate** (activates Policy v5.1).
   - Return to **Batch Processing & Export**, select Policy v5.1, and reprocess the blind test batch.
   - Download the decisions CSV and save to `submission/` as `vinay__run2.csv`.
   - *CLI Alternative:*
     ```bash
     node backend/src/scripts/exportDecisions.js path/to/blind_pr_batch.csv 5.1 submission/vinay__run2.csv
     ```

3. **Export Preferred Supplier Lists:**
   - In the **Supplier Ranking Analytics** view, select the required date and click **Export Preferred CSV**.
   - Save file to `submission/` as `vinay__preferred.csv`.
   - *CLI Alternative:*
     ```bash
     node backend/src/scripts/exportPreferred.js 2026-11-01 submission/vinay__preferred.csv
     ```

4. **Commit & Push Submission to GitHub (Before 12:00 Noon IST):**
   ```bash
   git add submission/
   git commit -m "Submit blind test output CSVs (run1, run2, preferred)"
   git push origin main
   ```

---

## 8. Data Privacy & Compliance

- The original task kit data files (`master_data/`, `contracts/`, `pr_batches/`, `*.pdf`, `*.csv`) are protected by `.gitignore` and are **not committed to the repository**.
- All documentation files (`README.md`, `APPROACH.md`, `DECISIONS.md`) and submission outputs strictly follow the assessment guidelines.
