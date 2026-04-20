import mongoose from "mongoose";

const credentialSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client", // 🔗 relation to Client
      required: true
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