# Corvo Engineering — Policy-Driven Autonomous Procurement Web Application

[![Vitest](https://img.shields.io/badge/tests-28%20passed-brightgreen.svg)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B%20%2F%20ESM-yellow.svg)]()
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)]()
[![Node](https://img.shields.io/badge/Node-20%2B-green.svg)]()
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)]()

Production-quality, policy-driven procurement automation web application built for **Corvo Engineering Pvt Ltd** as part of the **Cantill.ai Full-stack Intern Coding Challenge**.

---

## 1. System Overview

Corvo Engineering operates manufacturing plants at **PUN1 (Bhosari)** and **CHK1 (Chakan)**. Every day, employees raise purchase requisitions across factories. This system automates PR-to-PO procurement by applying **Corvo Procurement Policy Version 5.0** (and future amendments) deterministically:

- **Employee Chat Intake:** Conversational interface extracting item, quantity, plant, need-by date, and urgency with targeted follow-up questions for missing data.
- **Policy as Data (Zero Code Change):** Procurement rules, thresholds, and plant/category restrictions are stored as versioned JSON documents with effective dates.
- **Dynamic Decision Engine:** Executes item matching, PR clubbing (14-day creation / 7-day need-by windows), deterministic valuation, contract ceiling enforcement, and rule evaluation (Capex, Contract PO, Emergency PO, Spot PO, RFQ, RFP).
- **Multi-Factor Preferred Supplier Ranking:** Computes explainable rankings across 548-day history based on purchase frequency (35%), recency (25%), contract history (15%), on-time delivery (15%), and quality rating (10%).
- **Rate Contracts & Ceilings:** Enforces contract validity and ceiling room; recognizes **PDF-only contracts** (`RC-2026-031` and `RC-2026-033`).
- **PO Consolidation:** Consolidates eligible PO requirements sharing supplier, plant, and route within a 24-hour window into single purchase orders.
- **Buyer Workspace:** Full governance console with KPI telemetry, detailed requirement inspection, approvals, auditable overrides with mandatory written justifications, and audit trails.

---

## 2. Technology Stack

- **Backend:** Node.js, Express.js, JavaScript (ES6+ with ES Modules), Mongoose, MongoDB.
  - Automatic fallback to embedded in-memory MongoDB (`mongodb-memory-server`) if remote database is not configured.
- **Frontend:** React 18, Vite, JavaScript (ES6+), JSX, Tailwind CSS, Lucide Icons.
- **File Processing:** `csv-parse`, `csv-stringify`, `pdf-parse`, `multer`.
- **Testing:** Vitest (28 automated regression tests covering all 14 worked decisions, preferred rankings, boundary conditions, and amendments).
- **Containerization:** Multi-stage `Dockerfile` and `docker-compose.yml`.

---

## 3. Quick Start (One-Command Setup)

### Prerequisites
- Node.js $\ge 18$
- npm $\ge 9$
- (Optional) Docker and Docker Compose

### Option A: Local Run (No Docker Needed)

1. **Clone the repository:**
   ```bash
   git clone <REPO_URL>
   cd <REPO_NAME>
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Build applications:**
   ```bash
   npm run build:all
   ```

4. **Seed database (from private local kit or API):**
   ```bash
   npm --prefix backend run seed
   ```
   *(Note: If database is empty, the server also attempts automatic seeding on startup if data kit is available).*

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

## 4. Running Automated Tests

Run the full automated test suite:
```bash
npm test
```
Or directly in `backend/`:
```bash
cd backend
npm test
```

### Test Suite Coverage:
- **`tests/worked_examples.test.js` (17 tests):**
  - Decision 1 (Contract PO: PR-26-00019/1 $\to$ CONTRACT_PO, S001)
  - Decision 2 (PDF-only contract: PR-26-00045/1 $\to$ CONTRACT_PO, S021, RC-2026-031)
  - Decision 3 (Contract ceiling exhausted: PR-26-00004 & 00026 $\to$ RFQ, S014, S013, S016)
  - Decision 4 (Two contracts: PR-26-00034 & 00032 $\to$ CONTRACT_PO, S007)
  - Decision 5 (Split PRs clubbed: PR-26-00146, 00144, 00145 $\to$ SPOT_PO, S024)
  - Decision 6 (Different plants preventing clubbing: PUN1 vs CHK1)
  - Decision 7 (Free-text item matched: "hyd hose 1/2 inch 2 wire" $\to$ SPOT_PO, S023)
  - Decision 8 (Emergency PO: PR-26-00059/1 $\to$ EMERGENCY_PO, S014)
  - Decision 9 (RFQ above PO limit: "CMM calibration service" $\to$ RFQ, S043, S044, S042)
  - Decision 10 (RFQ small never bought: PR-26-00050/1 $\to$ RFQ, S003, S002, S005)
  - Decision 11 (RFP: PR-26-00100/1 $\to$ RFP, S020, S017, S019, S018)
  - Decision 12 (Capex sourcing: PR-26-00047/1 $\to$ CAPEX_SOURCING, S045, S047, S020, S048, S046)
  - Decision 13 (New item: PR-26-00170/1 $\to$ NEW_ITEM_SOURCING, no suggestions)
  - Decision 14 (PO consolidation: shared PO ID across separate requirements)
  - Preferred Supplier Rankings (Worked Example 1: ITM-1048, Example 2: ITM-1036, Example 3: ITM-1016)
- **`tests/boundary_and_rules.test.js` (8 tests):**
  - Exactly ₹200,000 threshold boundary
  - Exactly ₹500,000 emergency threshold boundary
  - Exactly ₹1,000,000 RFP threshold boundary
  - Exactly 14.0-day PR creation clubbing boundary
  - Exactly 7.0-day need-by date clubbing boundary
  - Exactly 24.0-hour PO consolidation window
  - Invalid plant handling (PUN2 marked `NOT_PROCESSED`)
  - Missing price on new items marked `NOT_PROCESSED`
- **`tests/policy_amendment.test.js` (3 tests):**
  - Parsing natural language amendment text into structured rules
  - Decision change verification between Policy v5.0 and v5.1 without application code change
  - Unaffected plant isolation (PUN1 preserves baseline rules while CHK1 updates)

---

## 5. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
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
| `POST` | `/api/data/seed` | Seeds database from private local kit or API payload |

---

## 6. Output CSV Formats

### Decisions CSV (13 Columns)
```csv
pr_no,pr_line,resolved_item_code,group_id,po_id,decision,route,supplier_id,unit_price,group_value_inr,suggested_supplier_ids,policy_version,reason
```

### Preferred Supplier CSV
```csv
item_code,rank,supplier_id,reference_price,top_3
```

---

## 7. Data Privacy & GitHub Safety

- The supplied task kit files (`Cantill_FullStack_Task_Kit/`, `master_data/`, `contracts/pdf/`, `pr_batches/`, `*.pdf`, `*.csv`) are protected by `.gitignore` and **must never be committed to GitHub**.
- The only exception permitted is the `submission/` directory for the final blind test CSV outputs.
- To seed the production database on a hosted deployment:
  1. Trigger private seed API `POST /api/data/seed` with authorized token.
  2. Or upload master data via the administrative UI.

---

## 8. Blind Test Execution Workflow

During the 2-hour blind test on **Thursday 19 November**:

1. **Run 1 (Process Blind PR Batch under Policy v5.0):**
   - Upload the new test PR batch CSV in the **Batch Processing & Export** view (or use `POST /api/process-batch`).
   - Click **Download Decisions CSV**.
   - Save file to the `submission/` folder as `<yourname>__run1.csv` (e.g. `vinay__run1.csv`).
   - *CLI Alternative:*
     ```bash
     node backend/src/scripts/exportDecisions.js path/to/blind_pr_batch.csv 5.0 submission/<yourname>__run1.csv
     ```

2. **Run 2 (Upload Policy Amendment & Reprocess):**
   - Navigate to the **Policy Management & Versioning** view in the UI.
   - Upload the policy amendment PDF or paste the amendment text into **Propose Policy Amendment**.
   - Review the rule comparison diff.
   - Click **Approve & Activate** (activates Policy v5.1).
   - Return to **Batch Processing & Export**, select Policy v5.1, and reprocess the blind test batch.
   - Download the decisions CSV and save to `submission/` as `<yourname>__run2.csv` (e.g. `vinay__run2.csv`).
   - *CLI Alternative:*
     ```bash
     node backend/src/scripts/exportDecisions.js path/to/blind_pr_batch.csv 5.1 submission/<yourname>__run2.csv
     ```

3. **Export Preferred Supplier Lists:**
   - In the **Supplier Ranking Analytics** view, select the required date and click **Export Preferred CSV**.
   - Save file to `submission/` as `<yourname>__preferred.csv` (e.g. `vinay__preferred.csv`).
   - *CLI Alternative:*
     ```bash
     node backend/src/scripts/exportPreferred.js 2026-11-01 submission/<yourname>__preferred.csv
     ```

4. **Commit & Push Submission to GitHub (Before 12:00 Noon IST):**
   ```bash
   git add submission/
   git commit -m "Submit blind test output CSVs (run1, run2, preferred)"
   git push origin main
   ```
