import { ItemMatcher } from './itemMatcher.js';
import { PRClubber } from './prClubber.js';
import { ContractManager } from './contractManager.js';
import { SupplierRanker } from './supplierRanker.js';
import { RuleEngine } from './ruleEngine.js';
import { POConsolidator } from './poConsolidator.js';

export class DecisionService {
  constructor(items = [], suppliers = [], contracts = [], poHistory = []) {
    this.itemMatcher = new ItemMatcher(items);
    this.contractManager = new ContractManager(contracts);
    this.supplierRanker = new SupplierRanker(suppliers, poHistory, contracts);
    this.supplierMap = new Map((suppliers || []).map((s) => [s.supplier_id, s]));
    this.itemMap = new Map((items || []).map((i) => [i.item_code, i]));
    this.poHistory = poHistory || [];
  }

  /**
   * Evaluates active purchase history within 365 days before requirement date
   */
  hasActivePoIn365Days(itemCode, reqDate) {
    const reqTime = new Date(reqDate).getTime();
    const cutoff365Time = reqTime - 365 * 24 * 60 * 60 * 1000;

    for (const po of this.poHistory) {
      if (po.item_code !== itemCode) continue;
      const sup = this.supplierMap.get(po.supplier_id);
      if (!sup || sup.status !== 'Active') continue;

      const poTime = new Date(po.po_date).getTime();
      if (poTime >= cutoff365Time && poTime <= reqTime) {
        return true;
      }
    }
    return false;
  }

  /**
   * Retrieves most recent PO price within 365 days
   */
  getMostRecentPoPriceIn365Days(itemCode, reqDate) {
    const reqTime = new Date(reqDate).getTime();
    const cutoff365Time = reqTime - 365 * 24 * 60 * 60 * 1000;

    const validPos = [];
    for (const po of this.poHistory) {
      if (po.item_code !== itemCode) continue;
      const sup = this.supplierMap.get(po.supplier_id);
      if (!sup || sup.status !== 'Active') continue;

      const poTime = new Date(po.po_date).getTime();
      if (poTime >= cutoff365Time && poTime <= reqTime) {
        validPos.push(po);
      }
    }

    if (validPos.length === 0) return null;
    validPos.sort((a, b) => new Date(b.po_date).getTime() - new Date(a.po_date).getTime());
    return validPos[0].unit_price;
  }

  /**
   * Processes a batch of PR lines under the given active policy
   */
  processBatch(rawLines, policy) {
    // 1. Resolve Items for each line
    for (const line of rawLines) {
      const match = this.itemMatcher.match(line.item_code, line.description);
      line.resolved_item_code = match.resolvedItemCode;
      line.is_new = match.isNew;
    }

    // 2. Club PR lines into requirements
    const clubbing = PRClubber.club(rawLines);
    const requirements = clubbing.requirements;
    const notProcessed = clubbing.notProcessedLines;

    // Process requirements in order of created_at (ascending)
    const processedRequirements = [];

    for (const req of requirements) {
      const reqDateStr = new Date(req.created_at).toISOString().slice(0, 10);

      // Section 1.2: New Item
      if (req.is_new) {
        const estPrice = req.estimated_unit_price || 0;
        const groupVal = Math.round(req.total_quantity * estPrice * 100) / 100;
        processedRequirements.push({
          ...req,
          decision: 'SOURCING_REQUEST',
          route: 'NEW_ITEM_SOURCING',
          unit_price: estPrice,
          group_value_inr: groupVal,
          supplier_id: undefined,
          suggested_supplier_ids: [],
          policy_version: policy.version,
          clause: '1.2',
          reason: 'New item not in item master goes to sourcing; valued at requester estimated price',
        });
        continue;
      }

      // Existing item lookup
      const itemCode = req.resolved_item_code;
      const item = this.itemMap.get(itemCode);
      const itemType = item ? item.item_type : 'Material';
      const category = item ? item.category : 'General';

      // Section 4: Contract check
      const contractCheck = this.contractManager.findApplicableContracts(
        itemCode,
        reqDateStr,
        req.total_quantity,
        this.supplierMap
      );

      // Preferred supplier check
      const preferred = this.supplierRanker.getPreferredSuppliers(itemCode, reqDateStr);
      const firstPreferred = preferred.length > 0 ? preferred[0] : null;

      // Section 3: Valuation
      let unitPrice = 0;
      let valuationSource = '';

      if (contractCheck.usableContract) {
        unitPrice = contractCheck.usableContract.rate;
        valuationSource = `contract rate (${contractCheck.usableContract.contract_id})`;
      } else if (contractCheck.lowestContractRate !== null) {
        unitPrice = contractCheck.lowestContractRate;
        valuationSource = `lowest applicable contract rate (${contractCheck.allApplicableContracts[0].contract_id})`;
      } else {
        const recentPoPrice = this.getMostRecentPoPriceIn365Days(itemCode, req.created_at);
        if (recentPoPrice !== null) {
          unitPrice = recentPoPrice;
          valuationSource = 'most recent PO in 365 days';
        } else if (item) {
          unitPrice = item.standard_price;
          valuationSource = 'item master standard price';
        }
      }

      const groupValue = Math.round(req.total_quantity * unitPrice * 100) / 100;
      const hasActivePo365 = this.hasActivePoIn365Days(itemCode, req.created_at);

      // Build Generic Evaluation Context
      const evalContext = {
        group_id: req.group_id,
        plant: req.plant,
        resolved_item_code: itemCode,
        item_type: itemType,
        category,
        total_quantity: req.total_quantity,
        unit_price: unitPrice,
        group_value_inr: groupValue,
        is_emergency: req.is_emergency,
        is_new: false,
        has_usable_contract: contractCheck.usableContract !== null,
        usable_contract_id: contractCheck.usableContract?.contract_id,
        usable_contract_rate: contractCheck.usableContract?.rate,
        usable_contract_supplier_id: contractCheck.usableContract?.supplier_id,
        usable_contract_supplier_name: contractCheck.usableContract?.supplier_name,
        has_active_po_365: hasActivePo365,
        first_preferred_supplier_id: firstPreferred?.supplier_id,
        first_preferred_supplier_name: firstPreferred?.name,
        first_preferred_reference_price: firstPreferred?.reference_price || undefined,
        preferred_supplier_count: preferred.length,
      };

      // Evaluate via Data-Driven Policy Rule Engine
      const ruleResult = RuleEngine.evaluate(policy, evalContext);

      // Apply Sourcing Suggestions if route requires suggestions
      let suggestedSuppliers = [];
      if (ruleResult.supplier_selection_strategy === 'SUGGEST_3') {
        suggestedSuppliers = this.supplierRanker.getSourcingSuggestions(itemCode, category, reqDateStr, 3);
      } else if (ruleResult.supplier_selection_strategy === 'SUGGEST_5') {
        suggestedSuppliers = this.supplierRanker.getSourcingSuggestions(itemCode, category, reqDateStr, 5);
      }

      // If Usable Contract PO, consume ceiling
      if (ruleResult.route === 'CONTRACT_PO' && contractCheck.usableContract) {
        this.contractManager.consumeCeiling(
          contractCheck.usableContract.contract_id,
          contractCheck.usableContract.required_value
        );
      }

      // If Emergency or Spot PO, update group_value_inr with supplier reference price
      let finalGroupValue = groupValue;
      if (
        (ruleResult.route === 'EMERGENCY_PO' || ruleResult.route === 'SPOT_PO') &&
        firstPreferred?.reference_price
      ) {
        finalGroupValue = Math.round(req.total_quantity * firstPreferred.reference_price * 100) / 100;
      }

      processedRequirements.push({
        ...req,
        decision: ruleResult.decision,
        route: ruleResult.route,
        unit_price: ruleResult.unit_price,
        group_value_inr: finalGroupValue,
        supplier_id: ruleResult.supplier_id,
        suggested_supplier_ids: suggestedSuppliers,
        policy_version: policy.version,
        clause: ruleResult.clause,
        reason: ruleResult.reason,
      });
    }

    // 3. Consolidate POs (Section 7)
    const consolidatable = processedRequirements.map((r) => ({
      group_id: r.group_id,
      decision: r.decision,
      route: r.route,
      supplier_id: r.supplier_id,
      plant: r.plant,
      created_at: r.created_at,
      group_value_inr: r.group_value_inr,
    }));

    const consolidationResult = POConsolidator.consolidate(consolidatable);
    const poMap = new Map(consolidationResult.updatedRequirements.map((r) => [r.group_id, r.po_id]));

    for (const req of processedRequirements) {
      req.po_id = poMap.get(req.group_id) || '';
    }

    // 4. Build output DecisionRecords (one row per original PR line)
    const records = [];

    // Map requirements by group_id
    for (const req of processedRequirements) {
      for (const line of req.lines) {
        records.push({
          pr_no: line.pr_no,
          pr_line: line.pr_line,
          resolved_item_code: req.resolved_item_code,
          group_id: req.group_id,
          po_id: req.po_id || '',
          decision: req.decision,
          route: req.route,
          supplier_id: req.supplier_id || '',
          unit_price: req.decision === 'PO' ? String(req.unit_price) : '',
          group_value_inr: String(req.group_value_inr),
          suggested_supplier_ids: req.suggested_supplier_ids.join(';'),
          policy_version: req.policy_version,
          reason: req.reason,
        });
      }
    }

    // Add not processed lines
    for (const np of notProcessed) {
      records.push({
        pr_no: np.line.pr_no,
        pr_line: np.line.pr_line,
        resolved_item_code: np.line.resolved_item_code || '',
        group_id: '',
        po_id: '',
        decision: 'SOURCING_REQUEST',
        route: 'NOT_PROCESSED',
        supplier_id: '',
        unit_price: '',
        group_value_inr: '',
        suggested_supplier_ids: '',
        policy_version: policy.version,
        reason: np.reason,
      });
    }

    // Sort output records by PR number and PR line to maintain determinism
    records.sort((a, b) => {
      const prA = String(a?.pr_no || '');
      const prB = String(b?.pr_no || '');
      const prDiff = prA.localeCompare(prB);
      if (prDiff !== 0) return prDiff;
      return (Number(a?.pr_line) || 0) - (Number(b?.pr_line) || 0);
    });

    return {
      records,
      requirements: processedRequirements,
      notProcessedCount: notProcessed.length,
      totalPrLines: rawLines.length,
      totalRequirements: processedRequirements.length,
      totalPOs: consolidationResult.consolidatedPOs.length,
    };
  }
}
