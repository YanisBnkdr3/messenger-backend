const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePic: { type: String, default: "" }, // URL de la photo
  online: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }, // date inscription
  friends: [
    {
      friendId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: {
        type: String,
        enum: ["pending", "received", "accepted", "rejected"], // ✅ ajouté "received"
        default: "pending",
      },
    },
  ],
});

module.exports = mongoose.model("User", UserSchema);
