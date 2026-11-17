import mongoose from 'mongoose';

const ConditionNodeSchema = new mongoose.Schema({
  field: { type: String },
  operator: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed },
  children: [{ type: mongoose.Schema.Types.Mixed }],
}, { _id: false });

const RuleDefinitionSchema = new mongoose.Schema({
  rule_id: { type: String, required: true },
  clause: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: Number, required: true },
  conditions: { type: ConditionNodeSchema, required: true },
  outcome: {
    decision: { type: String, enum: ['PO', 'SOURCING_REQUEST'], required: true },
    route: { type: String, required: true },
    supplier_selection_strategy: { type: String, required: true },
    requires_approval: { type: String },
    reason_template: { type: String, required: true },
  },
}, { _id: false });

const PolicySchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  effective_date: { type: String, required: true },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUPERSEDED', 'REJECTED'],
    default: 'DRAFT',
  },
  rules: [RuleDefinitionSchema],
  notes: { type: String },
  uploaded_by: { type: String, default: 'Procurement Admin' },
  created_at: { type: Date, default: Date.now },
  approved_by: { type: String },
  approved_at: { type: Date },
  diff_summary: { type: String },
});

export const Policy = mongoose.model('Policy', PolicySchema);
