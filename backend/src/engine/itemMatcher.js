export class ItemMatcher {
  constructor(items = []) {
    this.preparedItems = [];
    this.updateItems(items);
  }

  updateItems(items) {
    this.preparedItems = (items || []).map((item) => ({
      item_code: item.item_code,
      description: item.description,
      tokens: new Set(this.cleanAndTokenize(item.description)),
      item,
    }));
  }

  cleanText(s) {
    let text = (s || '').toLowerCase();
    // Expand common procurement abbreviations and synonyms
    text = text.replace(/\bbrg\b/g, 'ball bearing');
    text = text.replace(/\bpneu\b/g, 'pneumatic');
    text = text.replace(/\bhyd\b/g, 'hydraulic');
    text = text.replace(/\bwelding rod\b/g, 'welding electrode');
    text = text.replace(/\bmonitor 24"?\b/g, '24 inch monitor');
    text = text.replace(/\b24"\s*monitor\b/g, '24 inch monitor');
    // Strip request noise words
    text = text.replace(/\b(for maintenance|urgent|as per sample|repeat|nos|bkt|kg|ltr|mtr)\b/g, ' ');
    // Remove punctuation
    text = text.replace(/[^a-z0-9]/g, ' ');
    return text.trim().replace(/\s+/g, ' ');
  }

  cleanAndTokenize(s) {
    const cleaned = this.cleanText(s);
    return cleaned ? cleaned.split(' ') : [];
  }

  match(code, description) {
    // 1. If valid item code supplied, use directly
    if (code) {
      const trimmedCode = code.trim();
      const existing = this.preparedItems.find((p) => p.item_code === trimmedCode);
      if (existing) {
        return {
          resolvedItemCode: existing.item_code,
          isNew: false,
          confidence: 1.0,
          matchedDescription: existing.description,
        };
      }
    }

    if (!description || !description.trim()) {
      return { resolvedItemCode: 'NEW', isNew: true, confidence: 0 };
    }

    // 2. Match description
    const descTokens = new Set(this.cleanAndTokenize(description));
    if (descTokens.size === 0) {
      return { resolvedItemCode: 'NEW', isNew: true, confidence: 0 };
    }

    let bestCode = null;
    let bestDesc = null;
    let bestScore = 0;

    for (const prep of this.preparedItems) {
      const itemTokens = prep.tokens;
      if (itemTokens.size === 0) continue;

      let intersectionCount = 0;
      for (const t of descTokens) {
        if (itemTokens.has(t)) intersectionCount++;
      }

      const unionSize = descTokens.size + itemTokens.size - intersectionCount;
      let jaccard = unionSize > 0 ? intersectionCount / unionSize : 0;

      // Check subset match
      const isDescSubset = intersectionCount === descTokens.size;
      const isItemSubset = intersectionCount === itemTokens.size;

      if (isDescSubset || isItemSubset) {
        jaccard += 0.5;
      }

      if (jaccard > bestScore) {
        bestScore = jaccard;
        bestCode = prep.item_code;
        bestDesc = prep.description;
      }
    }

    // A score >= 0.8 is considered a reliable match in Corvo terminology
    if (bestScore >= 0.8 && bestCode) {
      return {
        resolvedItemCode: bestCode,
        isNew: false,
        confidence: Math.min(1.0, bestScore),
        matchedDescription: bestDesc || undefined,
      };
    }

    return {
      resolvedItemCode: 'NEW',
      isNew: true,
      confidence: 0,
    };
  }
}
