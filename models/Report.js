// models/Report.js
const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  originalName: String,
  filename: String,       // stored on disk
  mime: String,
  size: Number,
  summary: String,        // AI summary text
  keyFindings: [String],  // bullets extracted by AI (optional)
}, { timestamps: true });

module.exports = mongoose.model("Report", ReportSchema);
