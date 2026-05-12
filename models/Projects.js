import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client"
  },
  title: String,
  description: String,
  developer: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Developer"
}
}, { timestamps: true });

export default mongoose.model("Project", projectSchema);