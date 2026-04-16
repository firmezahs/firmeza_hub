import mongoose from "mongoose";

const developerSchema = new mongoose.Schema({
  dev_id: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ["frontend", "backend", "fullstack", "designer", "tester"] // you can modify
  },
  status: {
    type: String,
    default: "active",
    enum: ["active", "inactive"]
  }
}, { timestamps: true });

export default mongoose.model("Developer", developerSchema);