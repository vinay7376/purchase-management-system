export class POConsolidator {
  static consolidate(requirements) {
    // Process requirements in order of creation time
    const sorted = [...requirements].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const openPOs = [];
    let poCounter = 1;

    for (const req of sorted) {
      if (req.decision === 'PO' && req.supplier_id) {
        let joinedPO = null;

        // Join the EARLIEST open qualifying PO
        for (const po of openPOs) {
          if (
            po.supplier_id === req.supplier_id &&
            po.plant === req.plant &&
            po.route === req.route
          ) {
            // Check within 24 hours of the FIRST requirement on that PO
            const diffHours =
              (new Date(req.created_at).getTime() - new Date(po.created_at).getTime()) / (1000 * 60 * 60);

            if (diffHours >= 0 && diffHours <= 24.0) {
              joinedPO = po;
              break;
            }
          }
        }

        if (joinedPO) {
          req.po_id = joinedPO.po_id;
          joinedPO.requirement_ids.push(req.group_id);
          joinedPO.total_value_inr = Math.round((joinedPO.total_value_inr + req.group_value_inr) * 100) / 100;
        } else {
          const poId = `PO-${String(poCounter++).padStart(4, '0')}`;
          req.po_id = poId;
          openPOs.push({
            po_id: poId,
            supplier_id: req.supplier_id,
            plant: req.plant,
            route: req.route,
            created_at: new Date(req.created_at),
            requirement_ids: [req.group_id],
            total_value_inr: req.group_value_inr,
          });
        }
      } else {
        req.po_id = '';
      }
    }

    return {
      consolidatedPOs: openPOs,
      updatedRequirements: sorted,
    };
  }
}
