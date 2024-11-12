const mongoose = require("mongoose");

const productEntrySchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
});

const pondEntrySchema = new mongoose.Schema({
  pondName: { type: String, required: true },
  date: { type: String, required: true },
  entryTime: { type: Date, default: Date.now },
  products: [
    {
      category: { type: String, required: true },
      productEntries: [productEntrySchema],
    },
  ],
});

const PondEntry = mongoose.model("PondEntry", pondEntrySchema);

module.exports = PondEntry;
