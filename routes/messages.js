const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Message = require("../models/Message");

// Récupérer l’historique entre deux utilisateurs
router.get("/:friendId", auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: req.params.friendId },
        { senderId: req.params.friendId, receiverId: req.user.id },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: "Erreur serveur" });
  }
});
// Marquer les messages comme vus
router.post("/seen/:friendId", auth, async (req, res) => {
  try {
    await Message.updateMany(
      { senderId: req.params.friendId, receiverId: req.user.id, seen: false },
      { $set: { seen: true } }
    );
    res.json({ msg: "Messages marqués comme vus" });
  } catch (err) {
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

module.exports = router;
