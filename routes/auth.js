const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

// 📌 Inscription
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, profilePic } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      profilePic: profilePic || "", // base64 ou vide si pas fourni
    });

    await newUser.save();

    res.json({ msg: "Utilisateur créé avec succès" });
  } catch (err) {
    console.error("❌ Erreur register :", err);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// 📌 Connexion
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Utilisateur non trouvé" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: "Mot de passe incorrect" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        online: user.online,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("❌ Erreur login :", err);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// 📌 Récupérer infos utilisateur connecté
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(
      req.user.id,
      "name email profilePic online createdAt"
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// 📌 Récupérer tous les utilisateurs
router.get("/all", async (req, res) => {
  try {
    const users = await User.find({}, "name email profilePic online createdAt");
    res.json(users);
  } catch (err) {
    console.error("❌ Erreur /all :", err);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

module.exports = router;
