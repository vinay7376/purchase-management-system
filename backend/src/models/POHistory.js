import mongoose from 'mongoose';

const POHistorySchema = new mongoose.Schema({
  po_number: { type: String, required: true },
  po_date: { type: String, required: true },
  supplier_id: { type: String, required: true },
  item_code: { type: String, required: true },
  quantity: { type: Number, required: true },
  uom: { type: String, required: true },
  unit_price: { type: Number, required: true },
  plant: { type: String, required: true },
  delivered_on_time: { type: Boolean, required: true },
});

POHistorySchema.index({ item_code: 1, po_date: -1 });
POHistorySchema.index({ supplier_id: 1 });

export const POHistory = mongoose.model('POHistory', POHistorySchema);
