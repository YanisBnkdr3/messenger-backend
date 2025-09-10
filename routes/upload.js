const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

// 📌 Mise à jour de la photo de profil en Base64
router.post("/profile-pic", auth, async (req, res) => {
  try {
    const { profilePic } = req.body; // base64 envoyée depuis frontend
    const userId = req.user.id;

    if (!profilePic) {
      return res.status(400).json({ msg: "Aucune image reçue" });
    }

    // Mise à jour en BDD
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePic },
      { new: true } // renvoie le user mis à jour
    );

    res.json({ msg: "Photo mise à jour", profilePic: user.profilePic });
  } catch (err) {
    console.error("❌ Erreur upload:", err);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

module.exports = router;
