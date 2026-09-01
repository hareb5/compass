const mongoose = require("mongoose");
const { USER_ROLE_VALUES } = require("../constants/userRoles");

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

const compUserSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    employeeCode: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: USER_ROLE_VALUES,
      required: true,
    },
    managerRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompUser",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CompUser", compUserSchema);
