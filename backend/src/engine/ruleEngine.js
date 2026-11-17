export class RuleEngine {
  /**
   * Recursively evaluates a ConditionNode against the evaluation context.
   */
  static evaluateCondition(node, ctx) {
    switch (node.operator) {
      case 'and': {
        if (!node.children || node.children.length === 0) return true;
        return node.children.every((child) => this.evaluateCondition(child, ctx));
      }
      case 'or': {
        if (!node.children || node.children.length === 0) return false;
        return node.children.some((child) => this.evaluateCondition(child, ctx));
      }
      case 'not': {
        if (!node.children || node.children.length === 0) return false;
        return !this.evaluateCondition(node.children[0], ctx);
      }
      case '==': {
        if (!node.field) return false;
        const actual = ctx[node.field];
        if (typeof actual === 'string' && typeof node.value === 'string') {
          return actual.trim().toLowerCase() === node.value.trim().toLowerCase();
        }
        return actual === node.value;
      }
      case '!=': {
        if (!node.field) return false;
        const actual = ctx[node.field];
        if (typeof actual === 'string' && typeof node.value === 'string') {
          return actual.trim().toLowerCase() !== node.value.trim().toLowerCase();
        }
        return actual !== node.value;
      }
      case '<': {
        if (!node.field) return false;
        return Number(ctx[node.field]) < Number(node.value);
      }
      case '<=': {
        if (!node.field) return false;
        return Number(ctx[node.field]) <= Number(node.value);
      }
      case '>': {
        if (!node.field) return false;
        return Number(ctx[node.field]) > Number(node.value);
      }
      case '>=': {
        if (!node.field) return false;
        return Number(ctx[node.field]) >= Number(node.value);
      }
      case 'in': {
        if (!node.field || !Array.isArray(node.value)) return false;
        const actual = String(ctx[node.field]).trim().toLowerCase();
        return node.value.map((v) => String(v).trim().toLowerCase()).includes(actual);
      }
      case 'not_in': {
        if (!node.field || !Array.isArray(node.value)) return false;
        const actual = String(ctx[node.field]).trim().toLowerCase();
        return !node.value.map((v) => String(v).trim().toLowerCase()).includes(actual);
      }
      case 'between': {
        if (!node.field || !Array.isArray(node.value) || node.value.length !== 2) return false;
        const actual = Number(ctx[node.field]);
        return actual >= Number(node.value[0]) && actual <= Number(node.value[1]);
      }
      default:
        console.warn(`[RuleEngine] Unsupported operator: ${node.operator}`);
        return false;
    }
  }

  /**
   * Evaluates an active policy against a requirement context.
   * Traverses rules in priority order (ascending).
   */
  static evaluate(policy, ctx) {
    // Sort rules by priority ascending
    const sortedRules = [...(policy.rules || [])].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const isMatch = this.evaluateCondition(rule.conditions, ctx);
      if (isMatch) {
        // Construct templated reason
        let reason = rule.outcome.reason_template;
        for (const [key, val] of Object.entries(ctx)) {
          reason = reason.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val ?? ''));
        }

        // Determine supplier and price according to strategy
        let supplierId = undefined;
        let appliedPrice = ctx.unit_price;

        if (rule.outcome.supplier_selection_strategy === 'CONTRACT_SUPPLIER') {
          supplierId = ctx.usable_contract_supplier_id;
          appliedPrice = ctx.usable_contract_rate || ctx.unit_price;
        } else if (rule.outcome.supplier_selection_strategy === 'FIRST_PREFERRED') {
          supplierId = ctx.first_preferred_supplier_id;
          appliedPrice = ctx.first_preferred_reference_price || ctx.unit_price;
        }

        return {
          matchedRule: rule,
          decision: rule.outcome.decision,
          route: rule.outcome.route,
          supplier_id: supplierId,
          unit_price: appliedPrice,
          clause: rule.clause,
          reason,
          requires_approval: rule.outcome.requires_approval,
          supplier_selection_strategy: rule.outcome.supplier_selection_strategy,
        };
      }
    }

    // Fallback if no rule matches
    return {
      matchedRule: {
        rule_id: 'FALLBACK',
        clause: '5.6',
        description: 'Default Fallback Rule',
        priority: 999,
        conditions: { operator: 'and', children: [] },
        outcome: {
          decision: 'SOURCING_REQUEST',
          route: 'RFP',
          supplier_selection_strategy: 'SUGGEST_5',
          reason_template: 'No specific rule matched; defaulted to RFP',
        },
      },
      decision: 'SOURCING_REQUEST',
      route: 'RFP',
      unit_price: ctx.unit_price,
      clause: '5.6',
      reason: 'No policy rule matched; routed to RFP by default',
      supplier_selection_strategy: 'SUGGEST_5',
    };
  }

  /**
   * Default Policy v5.0 rules specification
   */
  static getDefaultPolicyV5Rules() {
    return [
      {
        rule_id: 'RULE_5.1',
        clause: '5.1',
        description: 'Capex items require Sourcing Request and capex approval',
        priority: 1,
        conditions: {
          field: 'item_type',
          operator: '==',
          value: 'Capex',
        },
        outcome: {
          decision: 'SOURCING_REQUEST',
          route: 'CAPEX_SOURCING',
          supplier_selection_strategy: 'SUGGEST_5',
          requires_approval: 'CAPEX_APPROVAL',
          reason_template: 'Capex item requires sourcing request (up to 5 suppliers); needs capex approval',
        },
      },
      {
        rule_id: 'RULE_5.2',
        clause: '5.2',
        description: 'Usable rate contract within ceiling',
        priority: 2,
        conditions: {
          field: 'has_usable_contract',
          operator: '==',
          value: true,
        },
        outcome: {
          decision: 'PO',
          route: 'CONTRACT_PO',
          supplier_selection_strategy: 'CONTRACT_SUPPLIER',
          reason_template: 'Rate contract {usable_contract_id} with {usable_contract_supplier_name} valid and within ceiling',
        },
      },
      {
        rule_id: 'RULE_5.3',
        clause: '5.3',
        description: 'Emergency requirement <= 500,000 INR with active purchase history in last 365 days',
        priority: 3,
        conditions: {
          operator: 'and',
          children: [
            { field: 'is_emergency', operator: '==', value: true },
            { field: 'group_value_inr', operator: '<=', value: 500000 },
            { field: 'has_active_po_365', operator: '==', value: true },
          ],
        },
        outcome: {
          decision: 'PO',
          route: 'EMERGENCY_PO',
          supplier_selection_strategy: 'FIRST_PREFERRED',
          reason_template: 'Emergency requirement <= 500,000 INR with active PO history in last 365 days; awarded to 1st preferred supplier {first_preferred_supplier_id}',
        },
      },
      {
        rule_id: 'RULE_5.4',
        clause: '5.4',
        description: 'Spot PO for value < 200,000 INR with active purchase history in last 365 days',
        priority: 4,
        conditions: {
          operator: 'and',
          children: [
            { field: 'group_value_inr', operator: '<', value: 200000 },
            { field: 'has_active_po_365', operator: '==', value: true },
          ],
        },
        outcome: {
          decision: 'PO',
          route: 'SPOT_PO',
          supplier_selection_strategy: 'FIRST_PREFERRED',
          reason_template: 'Spot PO for value < 200,000 INR with active PO history in last 365 days; awarded to 1st preferred supplier {first_preferred_supplier_id}',
        },
      },
      {
        rule_id: 'RULE_5.5',
        clause: '5.5',
        description: 'Value < 1,000,000 INR requires RFQ quotes',
        priority: 5,
        conditions: {
          field: 'group_value_inr',
          operator: '<',
          value: 1000000,
        },
        outcome: {
          decision: 'SOURCING_REQUEST',
          route: 'RFQ',
          supplier_selection_strategy: 'SUGGEST_3',
          reason_template: 'Requirement value < 1,000,000 INR requires RFQ quotes',
        },
      },
      {
        rule_id: 'RULE_5.6',
        clause: '5.6',
        description: 'Value >= 1,000,000 INR requires formal RFP',
        priority: 6,
        conditions: {
          field: 'group_value_inr',
          operator: '>=',
          value: 1000000,
        },
        outcome: {
          decision: 'SOURCING_REQUEST',
          route: 'RFP',
          supplier_selection_strategy: 'SUGGEST_5',
          reason_template: 'Requirement value >= 1,000,000 INR requires formal RFP',
        },
      },
    ];
  }
}
