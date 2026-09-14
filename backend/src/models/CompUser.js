const mongoose = require("mongoose");
const { USER_ROLE_VALUES } = require("../constants/userRoles");

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
      unique: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      default: "General",
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Employee",
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
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CompUser", compUserSchema);
