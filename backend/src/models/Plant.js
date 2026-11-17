import mongoose from 'mongoose';

const PlantSchema = new mongoose.Schema({
  plant: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});

export const Plant = mongoose.model('Plant', PlantSchema);
