const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");

// 📌 Envoyer une demande d’ami
router.post("/add/:friendId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.friendId;

    if (userId === friendId) {
      return res.status(400).json({ msg: "Impossible de s’ajouter soi-même" });
    }

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }

    // Vérifier si déjà amis ou demande existante
    const alreadyFriend = user.friends.find(
      (f) => f.friendId.toString() === friendId
    );
    if (alreadyFriend) {
      return res.status(400).json({ msg: "Déjà ami ou demande existante" });
    }

    // ➡️ Statut côté utilisateur (demande envoyée)
    user.friends.push({
      friendId: new mongoose.Types.ObjectId(friendId),
      status: "pending",
    });

    // ➡️ Statut côté ami (demande reçue)
    friend.friends.push({
      friendId: new mongoose.Types.ObjectId(userId),
      status: "received",
    });

    await user.save();
    await friend.save();

    res.json({ msg: "Demande d’ami envoyée" });
  } catch (err) {
    console.error("❌ Erreur add friend :", err);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// 📌 Accepter une demande d’ami
router.post("/accept/:friendId", auth, async (req, res) => {
  try {
    const userId = req.user.id; // Celui qui accepte
    const friendId = req.params.friendId; // Celui qui a envoyé

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }

    // ➡️ Mettre à jour côté user (demande reçue → acceptée)
    user.friends = user.friends.map((f) => {
      if (f.friendId.toString() === friendId && f.status === "received") {
        f.status = "accepted";
      }
      return f;
    });

    // ➡️ Mettre à jour côté ami (demande envoyée → acceptée)
    friend.friends = friend.friends.map((f) => {
      if (f.friendId.toString() === userId && f.status === "pending") {
        f.status = "accepted";
      }
      return f;
    });

    await user.save();
    await friend.save();

    res.json({ msg: "Demande acceptée" });
  } catch (err) {
    console.error("❌ Erreur accept friend :", err);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// 📌 Refuser une demande d’ami
router.post("/reject/:friendId", auth, async (req, res) => {
  try {
    const userId = req.user.id; // Celui qui rejette
    const friendId = req.params.friendId;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }

    // ➡️ Côté user (demande reçue → rejetée)
    user.friends = user.friends.map((f) => {
      if (f.friendId.toString() === friendId && f.status === "received") {
        f.status = "rejected";
      }
      return f;
    });

    // ➡️ Côté ami (demande envoyée → rejetée)
    friend.friends = friend.friends.map((f) => {
      if (f.friendId.toString() === userId && f.status === "pending") {
        f.status = "rejected";
      }
      return f;
    });

    await user.save();
    await friend.save();

    res.json({ msg: "Demande rejetée" });
  } catch (err) {
    console.error("❌ Erreur reject friend :", err);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// 📌 Voir la liste des amis (séparée par statut)
router.get("/list", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "friends.friendId",
      "name email profilePic online createdAt"
    );

    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }

    // Séparer les relations en 3 catégories
    const friendsList = {
      accepted: user.friends.filter((f) => f.status === "accepted"),
      pending: user.friends.filter((f) => f.status === "pending"), // demandes envoyées
      received: user.friends.filter((f) => f.status === "received"), // demandes reçues
    };

    // Log utile en backend
    console.log("✅ Liste des amis :", {
      accepted: friendsList.accepted.map((f) => f.friendId?.name),
      pending: friendsList.pending.map((f) => f.friendId?.name),
      received: friendsList.received.map((f) => f.friendId?.name),
    });

    res.json(friendsList);
  } catch (err) {
    console.error("❌ Erreur /friends/list :", err);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

module.exports = router;
