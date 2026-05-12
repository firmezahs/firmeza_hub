import mongoose from "mongoose";

const credentialSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },

    // NEW: links credential to a specific project for developer filtering
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null
    },

    title: {
      type: String,
      required: true
    },

    username: {
      type: String,
      required: true
    },

    password: {
      type: String,
      required: true
    },

    has_2fa: {
      type: Boolean,
      default: false
    },

    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Credential", credentialSchema);