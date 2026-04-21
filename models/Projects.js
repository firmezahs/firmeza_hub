import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client"
  },
  title: String,
  description: String,
  developer: String
}, { timestamps: true });

export default mongoose.model("Project", projectSchema);