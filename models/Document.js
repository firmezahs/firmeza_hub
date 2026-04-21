import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client"
  },
  fileName: String,
  filePath: String
}, { timestamps: true });

export default mongoose.model("Document", documentSchema);