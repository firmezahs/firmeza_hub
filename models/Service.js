import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    serviceId: {
      type: String,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// 🔥 AUTO GENERATE ID
serviceSchema.pre("save", async function () {
  if (!this.serviceId) {
    const lastService = await mongoose
      .model("Service")
      .findOne()
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastService && lastService.serviceId) {
      const lastNumber = parseInt(lastService.serviceId.split("_").pop());
      nextNumber = lastNumber + 1;
    }

    const paddedNumber = String(nextNumber).padStart(3, "0");

    this.serviceId = `HS_S_${paddedNumber}`;
  }
});

const Service = mongoose.model("Service", serviceSchema);

export default Service;