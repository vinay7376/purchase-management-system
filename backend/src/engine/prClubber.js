export class PRClubber {
  static VALID_PLANTS = new Set(['PUN1', 'CHK1']);

  static club(lines) {
    // 1. Sort PR lines by: (1) created_at, (2) pr_no, (3) pr_line
    const sortedLines = [...lines].sort((a, b) => {
      const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (timeDiff !== 0) return timeDiff;
      const prA = String(a?.pr_no || '');
      const prB = String(b?.pr_no || '');
      const prDiff = prA.localeCompare(prB);
      if (prDiff !== 0) return prDiff;
      return (Number(a?.pr_line) || 0) - (Number(b?.pr_line) || 0);
    });

    const requirements = [];
    const notProcessedLines = [];
    let reqCounter = 1;

    for (const line of sortedLines) {
      // Plant validation
      if (!this.VALID_PLANTS.has(line.plant)) {
        notProcessedLines.push({
          line,
          reason: `Invalid plant ${line.plant}. Only PUN1 and CHK1 are valid.`,
        });
        continue;
      }

      // New item handling (Clause 1.2)
      if (line.is_new) {
        if (line.estimated_unit_price === undefined || line.estimated_unit_price === null || isNaN(line.estimated_unit_price) || line.estimated_unit_price <= 0) {
          notProcessedLines.push({
            line,
            reason: 'New item with missing estimated unit price cannot be valued.',
          });
          continue;
        }

        const groupId = `REQ-${String(reqCounter++).padStart(4, '0')}`;
        requirements.push({
          group_id: groupId,
          plant: line.plant,
          resolved_item_code: 'NEW',
          created_at: new Date(line.created_at),
          need_by_date: line.need_by_date,
          is_emergency: (line.urgency || '').trim().toLowerCase() === 'emergency',
          is_new: true,
          estimated_unit_price: line.estimated_unit_price,
          lines: [line],
          total_quantity: line.quantity,
        });
        continue;
      }

      // Clause 2.2: Existing item clubbing
      const lineNeedBy = new Date(line.need_by_date).getTime();
      let joined = false;

      for (const req of requirements) {
        if (req.is_new) continue;
        if (req.resolved_item_code === line.resolved_item_code && req.plant === line.plant) {
          const reqFirstLine = req.lines[0];
          // Check creation time diff within 14 calendar days (measured against group's FIRST line)
          const creationDiffDays = (new Date(line.created_at).getTime() - new Date(req.created_at).getTime()) / (1000 * 60 * 60 * 24);
          // Check need-by date diff within 7 days (either side of group's FIRST line need-by date)
          const firstLineNeedBy = new Date(reqFirstLine.need_by_date).getTime();
          const needByDiffDays = Math.abs(lineNeedBy - firstLineNeedBy) / (1000 * 60 * 60 * 24);

          if (creationDiffDays <= 14.0 && needByDiffDays <= 7.0) {
            req.lines.push(line);
            req.total_quantity += line.quantity;
            if ((line.urgency || '').trim().toLowerCase() === 'emergency') {
              req.is_emergency = true;
            }
            joined = true;
            break; // Joins the EARLIEST qualifying requirement
          }
        }
      }

      if (!joined) {
        const groupId = `REQ-${String(reqCounter++).padStart(4, '0')}`;
        requirements.push({
          group_id: groupId,
          plant: line.plant,
          resolved_item_code: line.resolved_item_code || 'UNKNOWN',
          created_at: new Date(line.created_at),
          need_by_date: line.need_by_date,
          is_emergency: (line.urgency || '').trim().toLowerCase() === 'emergency',
          is_new: false,
          lines: [line],
          total_quantity: line.quantity,
        });
      }
    }

    return { requirements, notProcessedLines };
  }
}
