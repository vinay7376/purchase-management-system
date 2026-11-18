import { ItemMatcher } from '../engine/itemMatcher.js';

export class AIService {
  /**
   * Processes an employee conversational message and extracts PR entities
   */
  static processChatIntake(
    message,
    existingState = {},
    items = []
  ) {
    const text = message.trim();
    const lower = text.toLowerCase();
    const matcher = new ItemMatcher(items);

    // If message starts a brand new requisition, reset previous draft state
    const isNewRequisition = /^\s*(need\b|require\b|urgent need\b|please order\b|i need\b|request for\b)/i.test(text);
    const baseState = isNewRequisition ? {} : (existingState || {});

    const state = {
      itemDescription: baseState.itemDescription,
      matchedItemCode: baseState.matchedItemCode,
      isNewItem: baseState.isNewItem,
      quantity: baseState.quantity,
      uom: baseState.uom,
      plant: baseState.plant,
      need_by_date: baseState.need_by_date,
      urgency: baseState.urgency || 'Normal',
      estimated_unit_price: baseState.estimated_unit_price,
      isComplete: false,
      missingFields: [],
      assistantResponse: '',
    };

    // 1. Plant Extraction
    if (lower.includes('bhosari') || lower.includes('pun1')) {
      state.plant = 'PUN1';
    } else if (lower.includes('chakan') || lower.includes('chk1')) {
      state.plant = 'CHK1';
    }

    // 2. Urgency Extraction
    if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('breakdown') || lower.includes('critical')) {
      state.urgency = 'Emergency';
    }

    // 3. Price Extraction (for New Item or explicit price keywords)
    const cleanNumText = text.replace(/,/g, '');
    const priceKeywordMatch = cleanNumText.match(/\b(?:est|rate|price|cost|approx|inr|rs\.?)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\b/i);
    const pureNumMatch = Boolean(state.isNewItem && !state.estimated_unit_price) && cleanNumText.match(/^\s*(?:rs\.?|inr)?\s*([0-9]+(?:\.[0-9]+)?)\s*$/i);
    const priceMatch = priceKeywordMatch || pureNumMatch;

    if (priceMatch && state.isNewItem) {
      state.estimated_unit_price = parseFloat(priceMatch[1]);
    }

    // 4. Quantity & UOM Extraction (e.g. "200 nos", "200 nitrile gloves", "50 kg", "10 ltr")
    const isExplicitPrice = Boolean(priceMatch && (priceKeywordMatch || pureNumMatch));
    const qtyRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*(nos|bkt|kg|ltr|mtr|box|roll|pcs|job|bottles?|pairs?|units?)?\b/i;
    const qtyMatch = text.match(qtyRegex);

    if (qtyMatch && (!isExplicitPrice || isNewRequisition)) {
      const hasExplicitUom = Boolean(qtyMatch[2]);
      if (!state.quantity || isNewRequisition || hasExplicitUom) {
        state.quantity = parseFloat(qtyMatch[1]);
        if (qtyMatch[2]) {
          const rawUom = qtyMatch[2].toUpperCase();
          if (['NOS', 'BKT', 'KG', 'LTR', 'MTR', 'JOB'].includes(rawUom)) {
            state.uom = rawUom;
          } else if (['PCS', 'UNITS', 'PAIRS'].includes(rawUom)) {
            state.uom = 'NOS';
          }
        }
      }
    }

    // 4. Date Extraction ("by next Friday", "2026-11-25", "by 25 Nov")
    const dateIsoMatch = text.match(/\b(202[5-7]-[0-1][0-9]-[0-3][0-9])\b/);
    if (dateIsoMatch) {
      state.need_by_date = dateIsoMatch[1];
    } else if (lower.includes('next friday') || lower.includes('friday')) {
      // Calculate next Friday relative to current date
      const d = new Date('2026-11-17'); // Anchor to dataset November 2026
      const day = d.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      state.need_by_date = d.toISOString().slice(0, 10);
    } else if (lower.includes('tomorrow')) {
      const d = new Date('2026-11-17');
      d.setDate(d.getDate() + 1);
      state.need_by_date = d.toISOString().slice(0, 10);
    } else if (lower.includes('next week')) {
      const d = new Date('2026-11-17');
      d.setDate(d.getDate() + 7);
      state.need_by_date = d.toISOString().slice(0, 10);
    }

    // 5. Item Extraction & Matching
    if (!state.itemDescription) {
      // Extract candidate item text by stripping out quantity, plant, and date tokens
      let itemCandidate = text
        .replace(/\bneed\b/gi, '')
        .replace(/\brequire\b/gi, '')
        .replace(/\bplease\b/gi, '')
        .replace(/\bfor\s+(chakan|bhosari|chk1|pun1)\b/gi, '')
        .replace(/\b(chakan|bhosari|chk1|pun1)\b/gi, '')
        .replace(/\bby\s+(next\s+friday|tomorrow|next\s+week|[0-9]{4}-[0-9]{2}-[0-9]{2})\b/gi, '')
        .replace(qtyRegex, '')
        .replace(/\b(emergency|urgent|urgently)\b/gi, '')
        .trim();

      if (itemCandidate.length > 2) {
        state.itemDescription = itemCandidate;
      }
    }

    if (state.itemDescription && !state.matchedItemCode) {
      const match = matcher.match(undefined, state.itemDescription);
      if (!match.isNew && match.resolvedItemCode !== 'NEW') {
        state.matchedItemCode = match.resolvedItemCode;
        state.isNewItem = false;
        const itm = items.find((i) => i.item_code === match.resolvedItemCode);
        if (itm && !state.uom) {
          state.uom = itm.uom;
        }
      } else {
        state.matchedItemCode = undefined;
        state.isNewItem = true;
      }
    }



    // Determine missing required fields
    const missing = [];
    if (!state.itemDescription && !state.matchedItemCode) missing.push('Item Description');
    if (!state.quantity || state.quantity <= 0) missing.push('Quantity');
    if (!state.plant) missing.push('Plant (PUN1 Bhosari or CHK1 Chakan)');
    if (!state.need_by_date) missing.push('Need-by Date (YYYY-MM-DD)');
    if (state.isNewItem && (!state.estimated_unit_price || state.estimated_unit_price <= 0)) {
      missing.push('Estimated Unit Price (for new item sourcing)');
    }

    state.missingFields = missing;
    state.isComplete = missing.length === 0;

    // Generate response message
    if (missing.length > 0) {
      const questions = [];
      if (!state.itemDescription && !state.matchedItemCode) {
        questions.push('What item or material do you need?');
      }
      if (!state.quantity || state.quantity <= 0) {
        questions.push('How many units do you need?');
      }
      if (!state.plant) {
        questions.push('Which plant is this for? (PUN1 Bhosari or CHK1 Chakan)');
      }
      if (!state.need_by_date) {
        questions.push('What is the required need-by delivery date?');
      }
      if (state.isNewItem && (!state.estimated_unit_price || state.estimated_unit_price <= 0)) {
        questions.push(
          `I couldn't match "${state.itemDescription}" to an existing item in the catalog. Since this will be a new item sourcing request, please provide an estimated unit price in INR.`
        );
      }

      state.assistantResponse = `I noted your request. To finalize your Purchase Requisition, could you please confirm:\n• ${questions.join('\n• ')}`;
    } else {
      const itemDescDisplay = state.matchedItemCode
        ? `${state.matchedItemCode} (${items.find((i) => i.item_code === state.matchedItemCode)?.description})`
        : `[New Item] ${state.itemDescription} (Estimated rate: ₹${state.estimated_unit_price?.toLocaleString('en-IN')})`;

      state.assistantResponse = `All details received! Please confirm your Purchase Requisition:\n\n` +
        `• **Item:** ${itemDescDisplay}\n` +
        `• **Quantity:** ${state.quantity} ${state.uom || 'NOS'}\n` +
        `• **Plant:** ${state.plant === 'PUN1' ? 'PUN1 (Bhosari)' : 'CHK1 (Chakan)'}\n` +
        `• **Need-by Date:** ${state.need_by_date}\n` +
        `• **Urgency:** ${state.urgency}\n\n` +
        `Shall I create this Purchase Requisition now?`;
    }

    return state;
  }

  /**
   * Translates natural language or PDF amendment text into structured rules
   */
  static parsePolicyAmendment(
    text,
    existingRules,
    baseVersion
  ) {
    // Extract version (e.g. 5.1 or 6.0)
    const versionMatch = text.match(/version\s*([0-9]+\.[0-9]+)/i);
    const newVersion = versionMatch ? versionMatch[1] : `${parseFloat(baseVersion) + 0.1}`;

    // Extract effective date
    const dateMatch = text.match(/effective\s*(?:date\s*)?[:\-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const effectiveDate = dateMatch ? dateMatch[1] : '2026-12-01';

    const updatedRules = JSON.parse(JSON.stringify(existingRules));
    const changes = [];

    // Check for plant-specific threshold changes (e.g. "For CHK1 / Chakan plant, emergency threshold is 300,000")
    const chkEmergencyMatch = text.match(/chakan|chk1/i) && text.match(/emergency/i) && text.match(/([0-9]+(?:,[0-9]+)*)/);
    if (chkEmergencyMatch) {
      const valStr = chkEmergencyMatch[1].replace(/,/g, '');
      const newThreshold = parseFloat(valStr);
      if (newThreshold > 0) {
        // Insert plant-specific emergency rule before general emergency rule
        const newRule = {
          rule_id: 'RULE_5.3_CHK1',
          clause: '5.3a',
          description: `CHK1 Plant Specific: Emergency threshold <= ${newThreshold.toLocaleString('en-IN')} INR`,
          priority: 2.5,
          conditions: {
            operator: 'and',
            children: [
              { field: 'plant', operator: '==', value: 'CHK1' },
              { field: 'is_emergency', operator: '==', value: true },
              { field: 'group_value_inr', operator: '<=', value: newThreshold },
              { field: 'has_active_po_365', operator: '==', value: true },
            ],
          },
          outcome: {
            decision: 'PO',
            route: 'EMERGENCY_PO',
            supplier_selection_strategy: 'FIRST_PREFERRED',
            reason_template: `Chakan plant emergency requirement <= ${newThreshold.toLocaleString('en-IN')} INR with active PO history; awarded to 1st preferred supplier {first_preferred_supplier_id}`,
          },
        };
        updatedRules.push(newRule);
        changes.push(`Added plant-specific Rule 5.3a for CHK1: Emergency limit set to ₹${newThreshold.toLocaleString('en-IN')}`);
      }
    }

    // Check for spot threshold change (e.g. "Spot PO limit raised to 250,000")
    const spotMatch = text.match(/spot(?:\s+po)?\s+(?:limit|threshold)?.*?([0-9]+(?:,[0-9]+)*)/i);
    if (spotMatch) {
      const val = parseFloat(spotMatch[1].replace(/,/g, ''));
      if (val > 0) {
        const spotRule = updatedRules.find((r) => r.rule_id === 'RULE_5.4');
        if (spotRule) {
          const valChild = spotRule.conditions.children?.find((c) => c.field === 'group_value_inr');
          if (valChild) valChild.value = val;
          spotRule.description = `Spot PO for value < ${val.toLocaleString('en-IN')} INR with active purchase history`;
          spotRule.outcome.reason_template = `Spot PO for value < ${val.toLocaleString('en-IN')} INR with active PO history; awarded to 1st preferred supplier {first_preferred_supplier_id}`;
          changes.push(`Updated Rule 5.4: Spot PO threshold modified to ₹${val.toLocaleString('en-IN')}`);
        }
      }
    }

    // Sort rules by priority
    updatedRules.sort((a, b) => a.priority - b.priority);
    // Re-index priorities to integers 1, 2, 3...
    updatedRules.forEach((r, idx) => {
      r.priority = idx + 1;
    });

    const diffSummary = changes.length > 0
      ? changes.join('\n')
      : `Policy updated from Version ${baseVersion} to Version ${newVersion} effective ${effectiveDate}.`;

    return {
      newVersion,
      effectiveDate,
      rules: updatedRules,
      diffSummary,
    };
  }
}
