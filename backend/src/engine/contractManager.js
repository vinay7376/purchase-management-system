export class ContractManager {
  constructor(contractsList = []) {
    this.contracts = new Map();
    if (contractsList) {
      this.loadContracts(contractsList);
    }
  }

  loadContracts(contractsList) {
    this.contracts.clear();
    for (const c of contractsList) {
      const linesMap = new Map();
      for (const l of c.lines) {
        linesMap.set(l.item_code, l.rate);
      }
      this.contracts.set(c.contract_id, {
        contract_id: c.contract_id,
        supplier_id: c.supplier_id,
        supplier_name: c.supplier_name,
        start_date: c.start_date,
        end_date: c.end_date,
        value_cap: c.value_cap,
        consumed_value: c.consumed_value,
        lines: linesMap,
        source: c.source,
      });
    }
  }

  addContract(contract) {
    const linesMap = new Map();
    for (const l of contract.lines) {
      linesMap.set(l.item_code, l.rate);
    }
    this.contracts.set(contract.contract_id, {
      contract_id: contract.contract_id,
      supplier_id: contract.supplier_id,
      supplier_name: contract.supplier_name,
      start_date: contract.start_date,
      end_date: contract.end_date,
      value_cap: contract.value_cap,
      consumed_value: contract.consumed_value,
      lines: linesMap,
      source: contract.source || 'PDF_UPLOAD',
    });
  }

  getAllContracts() {
    return Array.from(this.contracts.values()).map((c) => ({
      ...c,
      lines: Array.from(c.lines.entries()).map(([item_code, rate]) => ({ item_code, rate })),
    }));
  }

  findApplicableContracts(
    item_code,
    requirementDateStr, // YYYY-MM-DD
    totalQuantity,
    supplierMap
  ) {
    const applicable = [];

    for (const c of this.contracts.values()) {
      if (!c.lines.has(item_code)) continue;

      // Check supplier active
      const supplier = supplierMap.get(c.supplier_id);
      if (!supplier || supplier.status !== 'Active') {
        // Excluded: Supplier is Blocked or Inactive
        continue;
      }

      // Check date validity (inclusive)
      if (requirementDateStr < c.start_date || requirementDateStr > c.end_date) {
        continue;
      }

      const rate = c.lines.get(item_code);
      const remaining = Math.max(0, c.value_cap - c.consumed_value);
      const required = totalQuantity * rate;
      const has_ceiling = required <= remaining;

      applicable.push({
        contract_id: c.contract_id,
        supplier_id: c.supplier_id,
        supplier_name: c.supplier_name,
        start_date: c.start_date,
        end_date: c.end_date,
        rate,
        value_cap: c.value_cap,
        consumed_value: c.consumed_value,
        remaining_ceiling: remaining,
        required_value: required,
        has_ceiling,
      });
    }

    // Sort by rate ascending
    applicable.sort((a, b) => a.rate - b.rate);

    const lowestContractRate = applicable.length > 0 ? applicable[0].rate : null;
    const usableContract = applicable.find((a) => a.has_ceiling) || null;

    return {
      usableContract,
      allApplicableContracts: applicable,
      lowestContractRate,
    };
  }

  consumeCeiling(contractId, value) {
    const c = this.contracts.get(contractId);
    if (c) {
      c.consumed_value += value;
    }
  }
}
