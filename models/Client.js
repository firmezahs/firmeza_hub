import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  clientId: {
  type: String,
  unique: true
},
  name: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  mobileNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  gstNumber: {
    type: String
  },
  address: {
    type: String
  },
  country: {
  type: String
},
  logo: {
    type: String
  }
}, { timestamps: true });

export default mongoose.model("Client", clientSchema);