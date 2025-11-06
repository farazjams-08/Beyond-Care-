// models/History.js
const mongoose = require("mongoose");

const HistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String }, // 'chat' | 'symptoms' | 'bmi'
  input: { type: String },
  response: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("History", HistorySchema);
