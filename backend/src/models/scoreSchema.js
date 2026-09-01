const mongoose = require("mongoose");

const scoreSchema = new mongoose.Schema(
  {
    communication: { type: Number, min: 1, max: 5, default: null },
    collaboration: { type: Number, min: 1, max: 5, default: null },
    results: { type: Number, min: 1, max: 5, default: null },
    innovation: { type: Number, min: 1, max: 5, default: null },
    accountability: { type: Number, min: 1, max: 5, default: null },
  },
  { _id: false },
);

module.exports = { scoreSchema };
