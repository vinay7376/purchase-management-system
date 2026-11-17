import { Policy } from '../models/Policy.js';
import { PDFExtractionService } from '../services/pdfExtractionService.js';
import { AIService } from '../services/aiService.js';
import { AuditLog } from '../models/AuditLog.js';
import { RuleEngine } from '../engine/ruleEngine.js';

export class PolicyController {
  /**
   * GET /api/policies
   */
  static async listPolicies(req, res) {
    try {
      const policies = await Policy.find().sort({ effective_date: -1 });
      return res.json(policies);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/policies/:version
   */
  static async getPolicy(req, res) {
    try {
      const policy = await Policy.findOne({ version: req.params.version });
      if (!policy) {
        return res.status(404).json({ error: `Policy version ${req.params.version} not found.` });
      }
      return res.json(policy);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/policies/upload-amendment
   * Accepts PDF file upload OR text description in request body
   */
  static async uploadAmendment(req, res) {
    try {
      let rawText = '';

      if (req.file) {
        rawText = await PDFExtractionService.extractText(req.file.buffer);
      } else if (req.body && req.body.text) {
        rawText = req.body.text;
      } else {
        return res.status(400).json({ error: 'Please provide an amendment PDF file or text description.' });
      }

      // Fetch currently active policy as base
      let basePolicy = await Policy.findOne({ status: 'ACTIVE' }).sort({ effective_date: -1 });
      if (!basePolicy) {
        basePolicy = await Policy.findOne().sort({ effective_date: -1 });
      }

      const existingRules = basePolicy ? basePolicy.rules : RuleEngine.getDefaultPolicyV5Rules();
      const baseVersion = basePolicy ? basePolicy.version : '5.0';

      // Parse amendment into structured rules
      const parsed = AIService.parsePolicyAmendment(rawText, existingRules, baseVersion);

      // Validate rules
      const validationErrors = [];
      parsed.rules.forEach((r, idx) => {
        if (!r.clause) validationErrors.push(`Rule at index ${idx} missing clause.`);
        if (!r.outcome || !r.outcome.decision || !r.outcome.route) {
          validationErrors.push(`Rule ${r.rule_id} missing valid decision or route.`);
        }
      });

      // Save as DRAFT / PENDING_APPROVAL policy document
      // Check if version already exists
      let existingDraft = await Policy.findOne({ version: parsed.newVersion });
      if (existingDraft) {
        existingDraft.title = `Corvo Procurement Policy Amendment v${parsed.newVersion}`;
        existingDraft.effective_date = parsed.effectiveDate;
        existingDraft.status = 'PENDING_APPROVAL';
        existingDraft.rules = parsed.rules;
        existingDraft.diff_summary = parsed.diffSummary;
        existingDraft.notes = rawText.slice(0, 500);
        await existingDraft.save();
      } else {
        existingDraft = await Policy.create({
          version: parsed.newVersion,
          title: `Corvo Procurement Policy Amendment v${parsed.newVersion}`,
          effective_date: parsed.effectiveDate,
          status: 'PENDING_APPROVAL',
          rules: parsed.rules,
          diff_summary: parsed.diffSummary,
          notes: rawText.slice(0, 500),
          uploaded_by: req.body.user || 'Procurement Administrator',
        });
      }

      // Audit log
      await AuditLog.create({
        user: req.body.user || 'Procurement Administrator',
        action: 'POLICY_AMENDMENT_PROPOSED',
        entity_type: 'POLICY',
        entity_id: parsed.newVersion,
        details: { diff: parsed.diffSummary, baseVersion },
      });

      return res.json({
        success: true,
        proposedPolicy: existingDraft,
        diffSummary: parsed.diffSummary,
        validationErrors,
        baseRules: existingRules,
        newRules: parsed.rules,
      });
    } catch (err) {
      console.error('[PolicyController] Error parsing amendment:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/policies/:version/approve
   */
  static async approvePolicy(req, res) {
    try {
      const { version } = req.params;
      const approver = req.body.user || 'Head of Procurement';

      const policy = await Policy.findOne({ version });
      if (!policy) {
        return res.status(404).json({ error: `Policy version ${version} not found.` });
      }

      // Supersede older active policies
      await Policy.updateMany(
        { version: { $ne: version }, status: 'ACTIVE' },
        { $set: { status: 'SUPERSEDED' } }
      );

      policy.status = 'ACTIVE';
      policy.approved_by = approver;
      policy.approved_at = new Date();
      await policy.save();

      await AuditLog.create({
        user: approver,
        action: 'POLICY_APPROVED_AND_ACTIVATED',
        entity_type: 'POLICY',
        entity_id: version,
        reason: req.body.reason || 'Approved by authorized procurement officer',
      });

      return res.json({
        success: true,
        message: `Policy version ${version} approved and activated from ${policy.effective_date}.`,
        policy,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/policies/:version/reject
   */
  static async rejectPolicy(req, res) {
    try {
      const { version } = req.params;
      const rejector = req.body.user || 'Head of Procurement';
      const reason = req.body.reason || 'Rejected by procurement reviewer';

      const policy = await Policy.findOne({ version });
      if (!policy) {
        return res.status(404).json({ error: `Policy version ${version} not found.` });
      }

      policy.status = 'REJECTED';
      await policy.save();

      await AuditLog.create({
        user: rejector,
        action: 'POLICY_AMENDMENT_REJECTED',
        entity_type: 'POLICY',
        entity_id: version,
        reason,
      });

      return res.json({
        success: true,
        message: `Policy version ${version} rejected.`,
        policy,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}
