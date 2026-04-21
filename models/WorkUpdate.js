import mongoose from "mongoose";

const workUpdateSchema = new mongoose.Schema(
    {
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed"],
            default: "Pending"
        },

        date: {
            type: Date,
            default: Date.now
        }


    },
    {
        timestamps: true
    }
);

export default mongoose.model("WorkUpdate", workUpdateSchema);
