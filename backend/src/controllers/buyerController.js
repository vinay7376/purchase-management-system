import { RequirementGroup } from '../models/RequirementGroup.js';
import { Contract } from '../models/Contract.js';
import { Policy } from '../models/Policy.js';
import { Supplier } from '../models/Supplier.js';
import { AuditLog } from '../models/AuditLog.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';

export class BuyerController {
  /**
   * GET /api/buyer/dashboard
   */
  static async getDashboardStats(req, res) {
    try {
      const [requirements, contracts, suppliers, policies] = await Promise.all([
        RequirementGroup.find().lean(),
        Contract.find().lean(),
        Supplier.find().lean(),
        Policy.find().lean(),
      ]);

      const totalRequirements = requirements.length;
      let totalPrLines = 0;
      let emergencyCount = 0;
      let poDecisions = 0;
      let sourcingRequests = 0;
      let pendingApprovals = 0;
      let approvedCount = 0;
      let overriddenCount = 0;

      for (const r of requirements) {
        totalPrLines += r.pr_lines.length;
        if (r.is_emergency) emergencyCount++;
        if (r.decision === 'PO') poDecisions++;
        if (r.decision === 'SOURCING_REQUEST') sourcingRequests++;
        if (r.status === 'DECIDED') pendingApprovals++;
        if (r.status === 'APPROVED') approvedCount++;
        if (r.status === 'OVERRIDDEN') overriddenCount++;
      }

      // Calculate total contract ceiling utilization
      let totalValueCap = 0;
      let totalConsumed = 0;
      for (const c of contracts) {
        totalValueCap += c.value_cap;
        totalConsumed += c.consumed_value;
      }

      const activePolicy = policies.find((p) => p.status === 'ACTIVE') || policies[0];

      return res.json({
        totalPrLines,
        totalRequirements,
        emergencyCount,
        poDecisions,
        sourcingRequests,
        pendingApprovals,
        approvedCount,
        overriddenCount,
        activePolicyVersion: activePolicy ? activePolicy.version : '5.0',
        activePolicyEffectiveDate: activePolicy ? activePolicy.effective_date : '2026-04-01',
        contractCeiling: {
          totalValueCap,
          totalConsumed,
          utilizationPct: totalValueCap > 0 ? Math.round((totalConsumed / totalValueCap) * 1000) / 10 : 0,
        },
        suppliersCount: {
          total: suppliers.length,
          active: suppliers.filter((s) => s.status === 'Active').length,
          blocked: suppliers.filter((s) => s.status === 'Blocked').length,
          inactive: suppliers.filter((s) => s.status === 'Inactive').length,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/buyer/requirements
   */
  static async listRequirements(req, res) {
    try {
      const { plant, decision, route, status, emergency, search, batch_id } = req.query;
      const query = {};

      if (batch_id && typeof batch_id === 'string' && batch_id !== 'all') query.batch_id = batch_id;
      if (plant && typeof plant === 'string') query.plant = plant;
      if (decision && typeof decision === 'string') query.decision = decision;
      if (route && typeof route === 'string') query.route = route;
      if (status && typeof status === 'string') query.status = status;
      if (emergency === 'true') query.is_emergency = true;
      if (search && typeof search === 'string') {
        query.$or = [
          { group_id: { $regex: search, $options: 'i' } },
          { resolved_item_code: { $regex: search, $options: 'i' } },
          { po_id: { $regex: search, $options: 'i' } },
          { 'pr_lines.description': { $regex: search, $options: 'i' } },
        ];
      }

      const requirements = await RequirementGroup.find(query).sort({ created_at: 1 });
      return res.json(requirements);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/buyer/requirements/:id
   */
  static async getRequirementDetail(req, res) {
    try {
      const { id } = req.params;
      const requirement = await RequirementGroup.findOne({ group_id: id });
      if (!requirement) {
        return res.status(404).json({ error: `Requirement ${id} not found.` });
      }

      // Fetch audit logs for this requirement
      const auditLogs = await AuditLog.find({
        entity_id: id,
        entity_type: 'REQUIREMENT',
      }).sort({ timestamp: -1 });

      return res.json({ requirement, auditLogs });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/buyer/requirements/:id/approve
   */
  static async approveRequirement(req, res) {
    try {
      const { id } = req.params;
      const approver = req.body.user || 'Buyer / Procurement Officer';

      const requirement = await RequirementGroup.findOne({ group_id: id });
      if (!requirement) {
        return res.status(404).json({ error: `Requirement ${id} not found.` });
      }

      const previousStatus = requirement.status;
      requirement.status = 'APPROVED';
      requirement.approved_by = approver;
      requirement.approved_at = new Date();
      await requirement.save();

      await AuditLog.create({
        user: approver,
        action: 'REQUIREMENT_APPROVED',
        entity_type: 'REQUIREMENT',
        entity_id: id,
        previous_state: { status: previousStatus },
        new_state: { status: 'APPROVED' },
        reason: req.body.reason || 'Requirement approved by buyer',
      });

      return res.json({ success: true, message: `Requirement ${id} approved.`, requirement });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/buyer/requirements/:id/override
   * Overrides decision with mandatory written reason
   */
  static async overrideRequirement(req, res) {
    try {
      const { id } = req.params;
      const { user, reason, newDecision, newRoute, newSupplierId, newUnitPrice } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        return res.status(400).json({ error: 'A mandatory written reason is required to override a decision.' });
      }

      const requirement = await RequirementGroup.findOne({ group_id: id });
      if (!requirement) {
        return res.status(404).json({ error: `Requirement ${id} not found.` });
      }

      const previousState = {
        decision: requirement.decision,
        route: requirement.route,
        supplier_id: requirement.supplier_id,
        unit_price: requirement.unit_price,
        status: requirement.status,
      };

      if (newDecision) requirement.decision = newDecision;
      if (newRoute) requirement.route = newRoute;
      if (newSupplierId) requirement.supplier_id = newSupplierId;
      if (newUnitPrice) {
        requirement.unit_price = parseFloat(newUnitPrice);
        requirement.group_value_inr = Math.round(requirement.total_quantity * requirement.unit_price * 100) / 100;
      }

      requirement.status = 'OVERRIDDEN';
      requirement.override_reason = reason.trim();
      requirement.overridden_by = user || 'Procurement Buyer';
      requirement.overridden_at = new Date();
      await requirement.save();

      await AuditLog.create({
        user: user || 'Procurement Buyer',
        action: 'DECISION_OVERRIDDEN',
        entity_type: 'REQUIREMENT',
        entity_id: id,
        previous_state: previousState,
        new_state: {
          decision: requirement.decision,
          route: requirement.route,
          supplier_id: requirement.supplier_id,
          unit_price: requirement.unit_price,
          status: 'OVERRIDDEN',
        },
        reason: reason.trim(),
      });

      return res.json({
        success: true,
        message: `Decision on requirement ${id} successfully overridden.`,
        requirement,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/buyer/audit-logs
   */
  static async listAuditLogs(req, res) {
    try {
      const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
      return res.json(logs);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}
