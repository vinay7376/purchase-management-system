import { describe, it, expect } from 'vitest';
import { PRClubber } from '../src/engine/prClubber.js';
import { POConsolidator } from '../src/engine/poConsolidator.js';
import { RuleEngine } from '../src/engine/ruleEngine.js';

describe('Boundary Values, Edge Cases and Constraints', () => {
  const policyV5 = {
    version: '5.0',
    title: 'Corvo Engineering Procurement Policy',
    effective_date: '2026-04-01',
    status: 'ACTIVE',
    rules: RuleEngine.getDefaultPolicyV5Rules(),
  };

  describe('Value Threshold Boundaries', () => {
    it('Threshold 200,000 INR: 199,999 INR routes to SPOT_PO, 200,000 INR routes to RFQ', () => {
      // 199,999 INR
      const ctxBelow = {
        group_id: 'REQ-TEST-1',
        plant: 'PUN1',
        resolved_item_code: 'ITM-1010',
        item_type: 'Material',
        category: 'Fasteners',
        total_quantity: 1,
        unit_price: 199999,
        group_value_inr: 199999,
        is_emergency: false,
        is_new: false,
        has_usable_contract: false,
        has_active_po_365: true,
        first_preferred_supplier_id: 'S007',
        first_preferred_reference_price: 199999,
        preferred_supplier_count: 1,
      };
      const resBelow = RuleEngine.evaluate(policyV5, ctxBelow);
      expect(resBelow.decision).toBe('PO');
      expect(resBelow.route).toBe('SPOT_PO');
      expect(resBelow.clause).toBe('5.4');

      // Exactly 200,000 INR
      const ctxExact = {
        ...ctxBelow,
        unit_price: 200000,
        group_value_inr: 200000,
      };
      const resExact = RuleEngine.evaluate(policyV5, ctxExact);
      expect(resExact.decision).toBe('SOURCING_REQUEST');
      expect(resExact.route).toBe('RFQ');
      expect(resExact.clause).toBe('5.5');
    });

    it('Threshold 500,000 INR Emergency: exactly 500,000 INR routes to EMERGENCY_PO, 500,001 INR routes to RFQ', () => {
      // Exactly 500,000 INR
      const ctx500k = {
        group_id: 'REQ-EMERG-1',
        plant: 'PUN1',
        resolved_item_code: 'ITM-1026',
        item_type: 'Material',
        category: 'Bearings & Transmission',
        total_quantity: 1,
        unit_price: 500000,
        group_value_inr: 500000,
        is_emergency: true,
        is_new: false,
        has_usable_contract: false,
        has_active_po_365: true,
        first_preferred_supplier_id: 'S014',
        first_preferred_reference_price: 500000,
        preferred_supplier_count: 1,
      };
      const res500k = RuleEngine.evaluate(policyV5, ctx500k);
      expect(res500k.decision).toBe('PO');
      expect(res500k.route).toBe('EMERGENCY_PO');
      expect(res500k.clause).toBe('5.3');

      // 500,001 INR
      const ctxAbove500k = {
        ...ctx500k,
        unit_price: 500001,
        group_value_inr: 500001,
      };
      const resAbove = RuleEngine.evaluate(policyV5, ctxAbove500k);
      expect(resAbove.decision).toBe('SOURCING_REQUEST');
      expect(resAbove.route).toBe('RFQ');
      expect(resAbove.clause).toBe('5.5');
    });

    it('Threshold 1,000,000 INR: 999,999 INR routes to RFQ, exactly 1,000,000 INR routes to RFP', () => {
      // 999,999 INR
      const ctxBelow1M = {
        group_id: 'REQ-1M-1',
        plant: 'CHK1',
        resolved_item_code: 'ITM-1034',
        item_type: 'Material',
        category: 'Electrical Spares',
        total_quantity: 1,
        unit_price: 999999,
        group_value_inr: 999999,
        is_emergency: false,
        is_new: false,
        has_usable_contract: false,
        has_active_po_365: false,
        preferred_supplier_count: 0,
      };
      const resBelow = RuleEngine.evaluate(policyV5, ctxBelow1M);
      expect(resBelow.decision).toBe('SOURCING_REQUEST');
      expect(resBelow.route).toBe('RFQ');
      expect(resBelow.clause).toBe('5.5');

      // Exactly 1,000,000 INR
      const ctxExact1M = {
        ...ctxBelow1M,
        unit_price: 1000000,
        group_value_inr: 1000000,
      };
      const resExact = RuleEngine.evaluate(policyV5, ctxExact1M);
      expect(resExact.decision).toBe('SOURCING_REQUEST');
      expect(resExact.route).toBe('RFP');
      expect(resExact.clause).toBe('5.6');
    });
  });

  describe('PR Clubbing Boundaries', () => {
    it('14-day creation time boundary: exactly 14.0 days clubs, 14.1 days does not club', () => {
      const baseDate = new Date('2026-11-01T10:00:00Z');
      const within14 = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000); // exactly 14 days
      const beyond14 = new Date(baseDate.getTime() + 14.1 * 24 * 60 * 60 * 1000);

      const linesWithin = [
        {
          pr_no: 'PR-1',
          pr_line: 1,
          created_at: baseDate,
          requester: 'A',
          department: 'D',
          plant: 'PUN1',
          description: 'Bearing',
          quantity: 10,
          uom: 'NOS',
          need_by_date: '2026-11-20',
          urgency: 'Normal',
          resolved_item_code: 'ITM-1021',
          is_new: false,
        },
        {
          pr_no: 'PR-2',
          pr_line: 1,
          created_at: within14,
          requester: 'B',
          department: 'D',
          plant: 'PUN1',
          description: 'Bearing',
          quantity: 5,
          uom: 'NOS',
          need_by_date: '2026-11-20',
          urgency: 'Normal',
          resolved_item_code: 'ITM-1021',
          is_new: false,
        },
      ];

      const resWithin = PRClubber.club(linesWithin);
      expect(resWithin.requirements.length).toBe(1);
      expect(resWithin.requirements[0].lines.length).toBe(2);

      const linesBeyond = [
        linesWithin[0],
        { ...linesWithin[1], created_at: beyond14, pr_no: 'PR-3' },
      ];
      const resBeyond = PRClubber.club(linesBeyond);
      expect(resBeyond.requirements.length).toBe(2);
    });

    it('7-day need-by boundary: exactly 7 days difference clubs, 8 days difference does not club', () => {
      const baseDate = new Date('2026-11-01T10:00:00Z');

      const lines7Days = [
        {
          pr_no: 'PR-1',
          pr_line: 1,
          created_at: baseDate,
          requester: 'A',
          department: 'D',
          plant: 'CHK1',
          description: 'Hose',
          quantity: 10,
          uom: 'NOS',
          need_by_date: '2026-11-20',
          urgency: 'Normal',
          resolved_item_code: 'ITM-1035',
          is_new: false,
        },
        {
          pr_no: 'PR-2',
          pr_line: 1,
          created_at: new Date('2026-11-02T10:00:00Z'),
          requester: 'B',
          department: 'D',
          plant: 'CHK1',
          description: 'Hose',
          quantity: 20,
          uom: 'NOS',
          need_by_date: '2026-11-27', // Exactly 7 days after 20 Nov
          urgency: 'Normal',
          resolved_item_code: 'ITM-1035',
          is_new: false,
        },
      ];

      const res7Days = PRClubber.club(lines7Days);
      expect(res7Days.requirements.length).toBe(1);

      const lines8Days = [
        lines7Days[0],
        { ...lines7Days[1], need_by_date: '2026-11-28', pr_no: 'PR-3' }, // 8 days after 20 Nov
      ];
      const res8Days = PRClubber.club(lines8Days);
      expect(res8Days.requirements.length).toBe(2);
    });
  });

  describe('PO Consolidation Boundary', () => {
    it('24-hour consolidation window: <= 24.0 hours consolidates into one PO, > 24 hours creates separate POs', () => {
      const baseTime = new Date('2026-11-02T10:00:00Z');
      const time24h = new Date('2026-11-03T10:00:00Z'); // Exactly 24 hours
      const time25h = new Date('2026-11-03T11:00:00Z'); // 25 hours

      const reqsWithin = [
        {
          group_id: 'REQ-1',
          decision: 'PO',
          route: 'SPOT_PO',
          supplier_id: 'S024',
          plant: 'CHK1',
          created_at: baseTime,
          group_value_inr: 50000,
        },
        {
          group_id: 'REQ-2',
          decision: 'PO',
          route: 'SPOT_PO',
          supplier_id: 'S024',
          plant: 'CHK1',
          created_at: time24h,
          group_value_inr: 30000,
        },
      ];

      const resWithin = POConsolidator.consolidate(reqsWithin);
      expect(resWithin.consolidatedPOs.length).toBe(1);
      expect(resWithin.updatedRequirements[0].po_id).toBe(resWithin.updatedRequirements[1].po_id);

      const reqsBeyond = [
        reqsWithin[0],
        { ...reqsWithin[1], group_id: 'REQ-3', created_at: time25h },
      ];
      const resBeyond = POConsolidator.consolidate(reqsBeyond);
      expect(resBeyond.consolidatedPOs.length).toBe(2);
      expect(resBeyond.updatedRequirements[0].po_id).not.toBe(resBeyond.updatedRequirements[1].po_id);
    });
  });

  describe('Anomalies & Integrity Protections', () => {
    it('Invalid plant PUN2 is marked NOT_PROCESSED', () => {
      const invalidPlantLine = [
        {
          pr_no: 'PR-26-00173',
          pr_line: 1,
          created_at: new Date('2026-11-05T12:00:00Z'),
          requester: 'Requester',
          department: 'Stores',
          plant: 'PUN2', // Invalid
          description: 'PP strapping roll',
          quantity: 10,
          uom: 'NOS',
          need_by_date: '2026-11-20',
          urgency: 'Normal',
          resolved_item_code: 'ITM-1045',
          is_new: false,
        },
      ];

      const res = PRClubber.club(invalidPlantLine);
      expect(res.requirements.length).toBe(0);
      expect(res.notProcessedLines.length).toBe(1);
      expect(res.notProcessedLines[0].reason).toContain('Invalid plant PUN2');
    });

    it('New item with missing estimated price is marked NOT_PROCESSED', () => {
      const unpricedNewLine = [
        {
          pr_no: 'PR-NEW-1',
          pr_line: 1,
          created_at: new Date('2026-11-05T12:00:00Z'),
          requester: 'Requester',
          department: 'Maintenance',
          plant: 'PUN1',
          description: 'Completely unknown custom equipment',
          quantity: 1,
          uom: 'NOS',
          need_by_date: '2026-11-20',
          urgency: 'Normal',
          resolved_item_code: 'NEW',
          is_new: true,
          estimated_unit_price: undefined, // Missing!
        },
      ];

      const res = PRClubber.club(unpricedNewLine);
      expect(res.requirements.length).toBe(0);
      expect(res.notProcessedLines.length).toBe(1);
      expect(res.notProcessedLines[0].reason).toContain('missing estimated unit price');
    });
  });
});
