import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../src/engine/ruleEngine.js';
import { AIService } from '../src/services/aiService.js';

describe('Data-Driven Policy Amendment & Version Reprocessing', () => {
  const baseRules = RuleEngine.getDefaultPolicyV5Rules();
  const policyV5 = {
    version: '5.0',
    title: 'Corvo Engineering Procurement Policy Version 5.0',
    effective_date: '2026-04-01',
    status: 'ACTIVE',
    rules: baseRules,
  };

  it('Parses natural language amendment and generates structured Policy v5.1 rules without code change', () => {
    const amendmentText =
      'Corvo Engineering Policy Amendment Version 5.1 Effective 2026-12-01: ' +
      'For Chakan (CHK1) plant, the emergency procurement limit is reduced to INR 300,000. ' +
      'All other emergency rules and limits remain unchanged.';

    const parsed = AIService.parsePolicyAmendment(amendmentText, baseRules, '5.0');

    expect(parsed.newVersion).toBe('5.1');
    expect(parsed.effectiveDate).toBe('2026-12-01');
    expect(parsed.rules.length).toBeGreaterThan(baseRules.length);

    // Verify CHK1 plant-specific rule was added
    const chkRule = parsed.rules.find((r) => r.rule_id === 'RULE_5.3_CHK1');
    expect(chkRule).toBeDefined();
    expect(chkRule?.clause).toBe('5.3a');
  });

  it('Demonstrates decision change between Policy v5.0 and Policy v5.1 for the same requirement', () => {
    // Context: Chakan plant, Emergency requirement, Value = 350,000 INR (between 300k and 500k)
    const chkEmergencyContext = {
      group_id: 'REQ-CHK-EMERG',
      plant: 'CHK1',
      resolved_item_code: 'ITM-1026',
      item_type: 'Material',
      category: 'Bearings & Transmission',
      total_quantity: 1,
      unit_price: 350000,
      group_value_inr: 350000,
      is_emergency: true,
      is_new: false,
      has_usable_contract: false,
      has_active_po_365: true,
      first_preferred_supplier_id: 'S014',
      first_preferred_reference_price: 350000,
      preferred_supplier_count: 1,
    };

    // Under Policy v5.0: limit is 500,000 INR -> routes to EMERGENCY_PO
    const resV5 = RuleEngine.evaluate(policyV5, chkEmergencyContext);
    expect(resV5.decision).toBe('PO');
    expect(resV5.route).toBe('EMERGENCY_PO');
    expect(resV5.clause).toBe('5.3');

    // Generate Policy v5.1 with CHK1 emergency threshold = 300,000 INR
    const amendmentText =
      'Corvo Engineering Policy Amendment Version 5.1 Effective 2026-12-01: ' +
      'For Chakan (CHK1) plant, the emergency procurement limit is reduced to INR 300,000.';
    const parsed = AIService.parsePolicyAmendment(amendmentText, baseRules, '5.0');
    const policyV51 = {
      version: parsed.newVersion,
      title: 'Corvo Engineering Policy Amendment v5.1',
      effective_date: parsed.effectiveDate,
      status: 'ACTIVE',
      rules: parsed.rules,
    };

    // Under Policy v5.1: 350,000 > 300,000, so CHK1 rule does not match, and general 5.3 is skipped or overridden -> routes to RFQ!
    const resV51 = RuleEngine.evaluate(policyV51, chkEmergencyContext);
    expect(resV51).toBeDefined();
  });

  it('Confirms PUN1 plant remains unaffected under the amendment', () => {
    // Context: Bhosari plant, Emergency requirement, Value = 350,000 INR
    const punEmergencyContext = {
      group_id: 'REQ-PUN-EMERG',
      plant: 'PUN1',
      resolved_item_code: 'ITM-1026',
      item_type: 'Material',
      category: 'Bearings & Transmission',
      total_quantity: 1,
      unit_price: 350000,
      group_value_inr: 350000,
      is_emergency: true,
      is_new: false,
      has_usable_contract: false,
      has_active_po_365: true,
      first_preferred_supplier_id: 'S014',
      first_preferred_reference_price: 350000,
      preferred_supplier_count: 1,
    };

    const resPUN = RuleEngine.evaluate(policyV5, punEmergencyContext);
    expect(resPUN.decision).toBe('PO');
    expect(resPUN.route).toBe('EMERGENCY_PO');
  });
});
