export class SupplierRanker {
  constructor(suppliers = [], poHistory = [], contracts = []) {
    this.suppliers = new Map();
    this.poHistory = [];
    this.contracts = [];
    this.setData(suppliers, poHistory, contracts);
  }

  setData(suppliers, poHistory, contracts) {
    this.suppliers.clear();
    for (const s of suppliers) {
      this.suppliers.set(s.supplier_id, s);
    }
    this.poHistory = poHistory || [];
    this.contracts = contracts || [];
  }

  getPreferredSuppliers(item_code, asOfDateStr) {
    const asOfTime = new Date(asOfDateStr).getTime();
    const cutoff548Time = asOfTime - 548 * 24 * 60 * 60 * 1000;

    // Map of eligible Active suppliers -> { pos: [], contracts: [] }
    const candidates = new Map();

    // 1. Gather POs in 548 days
    for (const po of this.poHistory) {
      if (po.item_code !== item_code) continue;
      const sup = this.suppliers.get(po.supplier_id);
      if (!sup || sup.status !== 'Active') continue; // Exclude Blocked/Inactive

      const poTime = new Date(po.po_date).getTime();
      if (poTime >= cutoff548Time && poTime <= asOfTime) {
        if (!candidates.has(po.supplier_id)) {
          candidates.set(po.supplier_id, { pos: [], contracts: [] });
        }
        candidates.get(po.supplier_id).pos.push(po);
      }
    }

    // 2. Gather Contracts covering item started on or before asOfDate
    for (const c of this.contracts) {
      const covers = c.lines.some((l) => l.item_code === item_code);
      if (!covers) continue;
      const sup = this.suppliers.get(c.supplier_id);
      if (!sup || sup.status !== 'Active') continue; // Exclude Blocked/Inactive

      const startTime = new Date(c.start_date).getTime();
      if (startTime <= asOfTime) {
        if (!candidates.has(c.supplier_id)) {
          candidates.set(c.supplier_id, { pos: [], contracts: [] });
        }
        candidates.get(c.supplier_id).contracts.push(c);
      }
    }

    if (candidates.size === 0) {
      return [];
    }

    // Determine max PO count for normalization
    let maxPos = 1;
    for (const c of candidates.values()) {
      if (c.pos.length > maxPos) maxPos = c.pos.length;
    }

    const scoredList = [];

    for (const [supplierId, data] of candidates.entries()) {
      const sup = this.suppliers.get(supplierId);
      const poCount = data.pos.length;

      // Calculate recency
      let recency = 0.0;
      let lastPoDate;
      let referencePrice = null;

      if (data.pos.length > 0) {
        // Sort POs newest first
        const sortedPos = [...data.pos].sort(
          (a, b) => new Date(b.po_date).getTime() - new Date(a.po_date).getTime()
        );
        const newestPo = sortedPos[0];
        lastPoDate = newestPo.po_date;
        referencePrice = newestPo.unit_price;

        const newestPoTime = new Date(newestPo.po_date).getTime();
        const daysAgo = (asOfTime - newestPoTime) / (1000 * 60 * 60 * 24);

        if (daysAgo <= 90) {
          recency = 1.0;
        } else if (daysAgo <= 365) {
          recency = 0.5;
        } else {
          recency = 0.0;
        }
      } else if (data.contracts.length > 0) {
        // Fallback reference price from most recent contract covering item
        const sortedContracts = [...data.contracts].sort(
          (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        );
        const latestContract = sortedContracts[0];
        const line = latestContract.lines.find((l) => l.item_code === item_code);
        if (line) {
          referencePrice = line.rate;
        }
      }

      const hasContract = data.contracts.length > 0;
      const onTimePct = sup.on_time_pct;
      const qualityRating = sup.quality_rating;

      // Scoring formula: 35% freq, 25% recency, 15% contract, 15% on-time, 10% quality
      const freqScore = poCount / maxPos;
      const otScore = onTimePct / 100.0;
      const qScore = qualityRating / 5.0;

      const totalScore =
        0.35 * freqScore +
        0.25 * recency +
        0.15 * (hasContract ? 1.0 : 0.0) +
        0.15 * otScore +
        0.10 * qScore;

      const breakdown = `Freq: ${(freqScore * 0.35).toFixed(3)}, Rec: ${(recency * 0.25).toFixed(3)}, Cnt: ${(hasContract ? 0.15 : 0).toFixed(3)}, OT: ${(otScore * 0.15).toFixed(3)}, Qual: ${(qScore * 0.10).toFixed(3)}`;

      scoredList.push({
        supplier_id: supplierId,
        name: sup.name,
        rank: 0,
        score: Math.round(totalScore * 10000) / 10000,
        po_count: poCount,
        recency,
        has_contract: hasContract,
        on_time_pct: onTimePct,
        quality_rating: qualityRating,
        reference_price: referencePrice,
        last_po_date: lastPoDate,
        reason_breakdown: breakdown,
      });
    }

    // Sort descending by score, tiebreak with on_time_pct, then quality_rating
    scoredList.sort((a, b) => {
      const sDiff = b.score - a.score;
      if (Math.abs(sDiff) > 0.0001) return sDiff;
      const otDiff = b.on_time_pct - a.on_time_pct;
      if (otDiff !== 0) return otDiff;
      return b.quality_rating - a.quality_rating;
    });

    scoredList.forEach((s, idx) => {
      s.rank = idx + 1;
    });

    return scoredList;
  }

  getCategorySuppliers(category, excludeSupplierIds) {
    const results = [];

    for (const sup of this.suppliers.values()) {
      if (excludeSupplierIds.has(sup.supplier_id)) continue;
      if (sup.status !== 'Active') continue; // Never suggest Blocked or Inactive

      // Category match (split on ; or ,)
      const categories = sup.categories.flatMap((c) =>
        c.split(/[;,]/).map((x) => x.trim())
      );

      if (categories.includes(category)) {
        const composite = 0.5 * (sup.on_time_pct / 100.0) + 0.5 * (sup.quality_rating / 5.0);
        results.push({
          supplier_id: sup.supplier_id,
          name: sup.name,
          on_time_pct: sup.on_time_pct,
          quality_rating: sup.quality_rating,
          composite_score: composite,
        });
      }
    }

    // Sort best delivery and quality first
    results.sort((a, b) => {
      const compDiff = b.composite_score - a.composite_score;
      if (Math.abs(compDiff) > 0.0001) return compDiff;
      const otDiff = b.on_time_pct - a.on_time_pct;
      if (otDiff !== 0) return otDiff;
      return b.quality_rating - a.quality_rating;
    });

    return results;
  }

  getSourcingSuggestions(
    item_code,
    category,
    asOfDateStr,
    limit
  ) {
    const preferred = this.getPreferredSuppliers(item_code, asOfDateStr);
    const suggestedIds = preferred.map((p) => p.supplier_id);

    if (suggestedIds.length < limit) {
      const excludeSet = new Set(suggestedIds);
      const topUps = this.getCategorySuppliers(category, excludeSet);
      for (const t of topUps) {
        if (suggestedIds.length >= limit) break;
        suggestedIds.push(t.supplier_id);
      }
    }

    return suggestedIds.slice(0, limit);
  }
}
