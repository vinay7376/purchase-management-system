import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
  item_code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  uom: { type: String, required: true },
  category: { type: String, required: true },
  item_type: { type: String, enum: ['Material', 'Service', 'Capex'], required: true },
  standard_price: { type: Number, required: true },
});

export const Item = mongoose.model('Item', ItemSchema);
