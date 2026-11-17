import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { PRClubber } from '../src/engine/prClubber.js';
import { ContractManager } from '../src/engine/contractManager.js';
import { SupplierRanker } from '../src/engine/supplierRanker.js';
import { RuleEngine } from '../src/engine/ruleEngine.js';
import { DecisionService } from '../src/engine/decisionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const kitDir = path.resolve(__dirname, '../../Cantill_FullStack_Task_Kit');

describe('Policy v5.0 Worked Examples & Preferred Supplier Rankings', () => {
  let items;
  let suppliers;
  let contracts;
  let poHistory;
  let samplePrs;
  let policyV5;
  let decisionService;

  beforeAll(() => {
    // Load Items
    const itemsRaw = parse(fs.readFileSync(path.join(kitDir, 'master_data/item_master.csv'), 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    items = itemsRaw.map((r) => ({
      item_code: r.item_code,
      description: r.description,
      uom: r.uom,
      category: r.category,
      item_type: r.item_type,
      standard_price: parseFloat(r.standard_price),
    }));

    // Load Suppliers
    const suppliersRaw = parse(fs.readFileSync(path.join(kitDir, 'master_data/supplier_master.csv'), 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    suppliers = suppliersRaw.map((r) => ({
      supplier_id: r.supplier_id,
      name: r.name,
      city: r.city,
      categories: r.categories.split(/[;,]/).map((c) => c.trim()),
      status: r.status,
      on_time_pct: parseFloat(r.on_time_pct),
      quality_rating: parseFloat(r.quality_rating),
    }));

    // Load Contracts + Lines + PDF-only
    const contractsRaw = parse(fs.readFileSync(path.join(kitDir, 'contracts/contract_register.csv'), 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    const linesRaw = parse(fs.readFileSync(path.join(kitDir, 'contracts/contract_lines.csv'), 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const linesMap = new Map();
    for (const l of linesRaw) {
      if (!linesMap.has(l.contract_id)) linesMap.set(l.contract_id, []);
      linesMap.get(l.contract_id).push({
        item_code: l.item_code,
        description: l.description,
        uom: l.uom,
        rate: parseFloat(l.rate),
      });
    }

    contracts = contractsRaw.map((r) => ({
      contract_id: r.contract_id,
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name,
      start_date: r.start_date,
      end_date: r.end_date,
      value_cap: parseFloat(r.value_cap),
      consumed_value: parseFloat(r.consumed_value),
      lines: linesMap.get(r.contract_id) || [],
      source: 'REGISTER',
    }));

    // Add PDF-Only Contracts
    contracts.push({
      contract_id: 'RC-2026-031',
      supplier_id: 'S021',
      supplier_name: 'Pneumatic Point',
      start_date: '2026-11-15',
      end_date: '2027-11-14',
      value_cap: 2000000,
      consumed_value: 0,
      lines: [
        { item_code: 'ITM-1036', description: 'Pneumatic cylinder 50x100', uom: 'NOS', rate: 3537.76 },
        { item_code: 'ITM-1037', description: 'Solenoid valve 5/2 1/4 inch', uom: 'NOS', rate: 2439.01 },
        { item_code: 'ITM-1039', description: 'FRL unit 1/2 inch', uom: 'NOS', rate: 2746.87 },
      ],
      source: 'PDF_UPLOAD',
    });

    contracts.push({
      contract_id: 'RC-2026-033',
      supplier_id: 'S035',
      supplier_name: 'Infoline Systems',
      start_date: '2026-11-20',
      end_date: '2027-11-19',
      value_cap: 5000000,
      consumed_value: 0,
      lines: [
        { item_code: 'ITM-1056', description: 'Laptop i5 16GB 512GB', uom: 'NOS', rate: 64654.36 },
        { item_code: 'ITM-1057', description: '24 inch monitor', uom: 'NOS', rate: 10689.51 },
      ],
      source: 'PDF_UPLOAD',
    });

    // Load PO History
    const poHistoryRaw = parse(fs.readFileSync(path.join(kitDir, 'master_data/po_history.csv'), 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    poHistory = poHistoryRaw.map((r) => ({
      po_number: r.po_number,
      po_date: r.po_date,
      supplier_id: r.supplier_id,
      item_code: r.item_code,
      quantity: parseFloat(r.quantity),
      uom: r.uom,
      unit_price: parseFloat(r.unit_price),
      plant: r.plant,
      delivered_on_time: r.delivered_on_time === 'True' || r.delivered_on_time === 'true',
    }));

    // Load PR Batch
    const prRaw = parse(fs.readFileSync(path.join(kitDir, 'pr_batches/sample_pr_batch.csv'), 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    samplePrs = prRaw.map((r) => ({
      pr_no: r.pr_no,
      pr_line: parseInt(r.pr_line, 10),
      created_at: new Date(r.created_at),
      requester: r.requester,
      department: r.department,
      plant: r.plant,
      item_code: r.item_code || undefined,
      description: r.description,
      quantity: parseFloat(r.quantity),
      uom: r.uom,
      estimated_unit_price: r.estimated_unit_price ? parseFloat(r.estimated_unit_price) : undefined,
      need_by_date: r.need_by_date,
      urgency: r.urgency || 'Normal',
    }));

    // Policy v5.0
    policyV5 = {
      version: '5.0',
      title: 'Corvo Engineering Procurement Policy',
      effective_date: '2026-04-01',
      status: 'ACTIVE',
      rules: RuleEngine.getDefaultPolicyV5Rules(),
    };

    decisionService = new DecisionService(items, suppliers, contracts, poHistory);
  });

  // Section 6: Preferred Supplier Rankings Check
  describe('Preferred Supplier Ranking Examples (Worked_Examples.pdf pg 5)', () => {
    it('Example 1: ITM-1048 (Nitrile coated gloves) as of 1 Nov 2026', () => {
      const ranker = new SupplierRanker(suppliers, poHistory, contracts);
      const ranked = ranker.getPreferredSuppliers('ITM-1048', '2026-11-01');

      expect(ranked.length).toBe(2);
      // Rank 1: S029 SafeGuard Industrial Supplies
      expect(ranked[0].supplier_id).toBe('S029');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].po_count).toBe(7);
      expect(ranked[0].recency).toBe(1.0);
      expect(ranked[0].has_contract).toBe(true);

      // Rank 2: S030 Karam Safety Distributor
      expect(ranked[1].supplier_id).toBe('S030');
      expect(ranked[1].rank).toBe(2);
      expect(ranked[1].po_count).toBe(4);
      expect(ranked[1].recency).toBe(1.0);
      expect(ranked[1].has_contract).toBe(false);

      // S031 is Inactive, must be excluded!
      expect(ranked.some((r) => r.supplier_id === 'S031')).toBe(false);
    });

    it('Example 2: ITM-1036 (Pneumatic cylinder 50x100) as of 1 Nov 2026', () => {
      const ranker = new SupplierRanker(suppliers, poHistory, contracts);
      const ranked = ranker.getPreferredSuppliers('ITM-1036', '2026-11-01');

      expect(ranked.length).toBe(3);
      // Rank 1: S023 Hydrax Hydraulics
      expect(ranked[0].supplier_id).toBe('S023');
      expect(ranked[0].recency).toBe(1.0);

      // Rank 2: S022 Fluidline Hydraulics
      expect(ranked[1].supplier_id).toBe('S022');
      expect(ranked[1].recency).toBe(0.5);

      // Rank 3: S024 Janatics Dealer Chakan
      expect(ranked[2].supplier_id).toBe('S024');
      expect(ranked[2].recency).toBe(0.0);
    });

    it('Example 3: ITM-1016 (MIG wire ER70S-6 1.2mm) as of 1 Nov 2026', () => {
      const ranker = new SupplierRanker(suppliers, poHistory, contracts);
      const ranked = ranker.getPreferredSuppliers('ITM-1016', '2026-11-01');

      expect(ranked.length).toBe(2);
      // Rank 1: S009 Weldtech Supplies
      expect(ranked[0].supplier_id).toBe('S009');
      expect(ranked[0].has_contract).toBe(true);

      // Rank 2: S010 Inox Gases Dealer Pune
      expect(ranked[1].supplier_id).toBe('S010');
      expect(ranked[1].has_contract).toBe(false);
    });
  });

  // Section 5: All 14 Worked Decision Scenarios
  describe('All 14 Worked Decisions Verification', () => {
    let result;

    beforeAll(() => {
      result = decisionService.processBatch(samplePrs, policyV5);
    });

    it('Decision 1 (Contract PO): PR-26-00019/1 -> CONTRACT_PO, S001', () => {
      const rec = result.records.find((r) => r.pr_no === 'PR-26-00019' && r.pr_line === 1);
      expect(rec).toBeDefined();
      expect(rec.decision).toBe('PO');
      expect(rec.route).toBe('CONTRACT_PO');
      expect(rec.supplier_id).toBe('S001');
      expect(rec.resolved_item_code).toBe('ITM-1002');
      expect(Math.round(parseFloat(rec.group_value_inr))).toBe(137531);
    });

    it('Decision 2 (PDF-only contract): PR-26-00045/1 -> CONTRACT_PO, S021, RC-2026-031', () => {
      const rec = result.records.find((r) => r.pr_no === 'PR-26-00045' && r.pr_line === 1);
      expect(rec).toBeDefined();
      expect(rec.decision).toBe('PO');
      expect(rec.route).toBe('CONTRACT_PO');
      expect(rec.supplier_id).toBe('S021');
      expect(rec.resolved_item_code).toBe('ITM-1037');
      expect(Math.round(parseFloat(rec.group_value_inr))).toBe(26829);
    });

    it('Decision 3 (Contract ceiling exhausted): PR-26-00004/1 & PR-26-00026/1 clubbed -> RFQ, suggested S014, S013, S016', () => {
      const r1 = result.records.find((r) => r.pr_no === 'PR-26-00004' && r.pr_line === 1);
      const r2 = result.records.find((r) => r.pr_no === 'PR-26-00026' && r.pr_line === 1);

      expect(r1.group_id).toBe(r2.group_id);
      expect(r1.resolved_item_code).toBe('ITM-1022');
      expect(r1.decision).toBe('SOURCING_REQUEST');
      expect(r1.route).toBe('RFQ');
      expect(Math.round(parseFloat(r1.group_value_inr))).toBe(220256);
      expect(r1.suggested_supplier_ids).toBe('S014;S013;S016');
    });

    it('Decision 4 (Two contracts): PR-26-00034/1 & PR-26-00032/1 -> CONTRACT_PO, S007 (RC-2026-013)', () => {
      const r1 = result.records.find((r) => r.pr_no === 'PR-26-00034' && r.pr_line === 1);
      const r2 = result.records.find((r) => r.pr_no === 'PR-26-00032' && r.pr_line === 1);

      expect(r1.group_id).toBe(r2.group_id);
      expect(r1.decision).toBe('PO');
      expect(r1.route).toBe('CONTRACT_PO');
      expect(r1.supplier_id).toBe('S007');
      expect(Math.round(parseFloat(r1.group_value_inr))).toBe(32547);
    });

    it('Decision 5 (Split PRs clubbed into one): PR-26-00146, 00144, 00145 -> SPOT_PO, S024', () => {
      const lines = ['PR-26-00146', 'PR-26-00144', 'PR-26-00145'].map((no) =>
        result.records.find((r) => r.pr_no === no && r.pr_line === 1)
      );

      const groupId = lines[0].group_id;
      expect(lines.every((l) => l.group_id === groupId)).toBe(true);
      expect(lines[0].decision).toBe('PO');
      expect(lines[0].route).toBe('SPOT_PO');
      expect(lines[0].supplier_id).toBe('S024');
      expect(Math.round(parseFloat(lines[0].group_value_inr))).toBe(126472);
    });

    it('Decision 6 (Same item, not clubbed due to different plants): PR-26-00106 (PUN1) and PR-26-00103 (CHK1)', () => {
      const rPUN1 = result.records.find((r) => r.pr_no === 'PR-26-00106' && r.pr_line === 1);
      const rCHK1 = result.records.find((r) => r.pr_no === 'PR-26-00103' && r.pr_line === 1);

      expect(rPUN1.group_id).not.toBe(rCHK1.group_id);
      expect(rPUN1.decision).toBe('PO');
      expect(rPUN1.route).toBe('SPOT_PO');
      expect(rCHK1.decision).toBe('PO');
      expect(rCHK1.route).toBe('SPOT_PO');
      expect(rPUN1.supplier_id).toBe('S027');
      expect(rCHK1.supplier_id).toBe('S027');
    });

    it('Decision 7 (Free-text item matched): PR-26-00088/1 "hyd hose 1/2 inch 2 wire" -> SPOT_PO, S023', () => {
      const rec = result.records.find((r) => r.pr_no === 'PR-26-00088' && r.pr_line === 1);
      expect(rec.resolved_item_code).toBe('ITM-1035');
      expect(rec.decision).toBe('PO');
      expect(rec.route).toBe('SPOT_PO');
      expect(rec.supplier_id).toBe('S023');
      expect(Math.round(parseFloat(rec.group_value_inr))).toBe(97955);
    });

    it('Decision 8 (Emergency PO): PR-26-00059/1 -> EMERGENCY_PO, S014', () => {
      const rec = result.records.find((r) => r.pr_no === 'PR-26-00059' && r.pr_line === 1);
      expect(rec.decision).toBe('PO');
      expect(rec.route).toBe('EMERGENCY_PO');
      expect(rec.supplier_id).toBe('S014');
      expect(Math.round(parseFloat(rec.group_value_inr))).toBe(253184);
    });

    it('Decision 9 (RFQ above PO limit): PR-26-00089/1 "CMM calibration service" -> RFQ, suggested S043, S044, S042', () => {
      const rec = result.records.find((r) => r.pr_no === 'PR-26-00089' && r.pr_line === 1);
      expect(rec.resolved_item_code).toBe('ITM-1066');
      expect(rec.decision).toBe('SOURCING_REQUEST');
      expect(rec.route).toBe('RFQ');
      expect(Math.round(parseFloat(rec.group_value_inr))).toBe(336562);
      expect(rec.suggested_supplier_ids).toBe('S043;S044;S042');
    });

    it('Decision 10 (RFQ small but never bought): PR-26-00050/1 -> RFQ, suggested S003, S002, S005', () => {
      const rec = result.records.find((r) => r.pr_no === 'PR-26-00050' && r.pr_line === 1);
      expect(rec.decision).toBe('SOURCING_REQUEST');
      expect(rec.route).toBe('RFQ');
      expect(Math.round(parseFloat(rec.group_value_inr))).toBe(80300);
      expect(rec.suggested_supplier_ids).toBe('S003;S002;S005');
    });

    it('Decision 11 (RFP): PR-26-00100/1 -> RFP, 4 eligible suppliers S020, S019, S017, S018', () => {
      const rec = result.records.find((r) => r.pr_no === 'PR-26-00100' && r.pr_line === 1);
      expect(rec.decision).toBe('SOURCING_REQUEST');
      expect(rec.route).toBe('RFP');
      expect(parseFloat(rec.group_value_inr)).toBeGreaterThanOrEqual(1000000);
      expect(rec.suggested_supplier_ids.split(';').length).toBe(4);
    });

    it('Decision 12 (Capex): PR-26-00047/1 "eot crane 5 ton" -> CAPEX_SOURCING, suggested 5 suppliers', () => {
      const rec = result.records.find((r) => r.pr_no === 'PR-26-00047' && r.pr_line === 1);
      expect(rec.resolved_item_code).toBe('ITM-1071');
      expect(rec.decision).toBe('SOURCING_REQUEST');
      expect(rec.route).toBe('CAPEX_SOURCING');
      expect(Math.round(parseFloat(rec.group_value_inr))).toBe(6036704);
      expect(rec.suggested_supplier_ids).toBe('S045;S047;S020;S048;S046');
    });

    it('Decision 13 (New item): PR-26-00170/1 "Drinking water purifier 50 LPH" -> NEW_ITEM_SOURCING, no suggestions', () => {
      const rec = result.records.find((r) => r.pr_no === 'PR-26-00170' && r.pr_line === 1);
      expect(rec.resolved_item_code).toBe('NEW');
      expect(rec.decision).toBe('SOURCING_REQUEST');
      expect(rec.route).toBe('NEW_ITEM_SOURCING');
      expect(Math.round(parseFloat(rec.group_value_inr))).toBe(141100);
      expect(rec.suggested_supplier_ids).toBe('');
    });

    it('Decision 14 (PO consolidation): REQ with PR-26-00034 and REQ with PR-26-00031 share PO ID', () => {
      const r1 = result.records.find((r) => r.pr_no === 'PR-26-00034' && r.pr_line === 1);
      const r2 = result.records.find((r) => r.pr_no === 'PR-26-00031' && r.pr_line === 1);

      expect(r1.group_id).not.toBe(r2.group_id);
      expect(r1.decision).toBe('PO');
      expect(r2.decision).toBe('PO');
      expect(r1.supplier_id).toBe(r2.supplier_id);
      expect(r1.po_id).toBeTruthy();
      expect(r1.po_id).toBe(r2.po_id); // Consolidated!
    });
  });
});
