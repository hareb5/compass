const mongoose = require("mongoose");
const { scoreSchema } = require("./scoreSchema");

const compAssessmentSchema = new mongoose.Schema(
  {
    employeeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompUser",
      required: true,
      unique: true,
    },
    managerRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompUser",
      required: true,
      index: true,
    },
    employeeScores: {
      type: scoreSchema,
      default: null,
    },
    managerScores: {
      type: scoreSchema,
      default: null,
    },
    employeeSubmittedAt: {
      type: Date,
      default: null,
    },
    managerSubmittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CompAssessment", compAssessmentSchema);
