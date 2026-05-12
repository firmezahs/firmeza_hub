import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client"
    },

    // NEW: links document to a specific project for developer filtering
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null
    },

    fileName: String,
    filePath: String
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);