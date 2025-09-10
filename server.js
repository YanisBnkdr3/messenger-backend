const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

// Import modèles & routes
const User = require("./models/User");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);

// 🔹 Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000", // Dev local
      "https://ybchat.netlify.app", // ✅ sans le "/" à la fin
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// 🔹 Routes API
app.use("/api/auth", require("./routes/auth"));
app.use("/api/friends", require("./routes/friends"));
app.use("/api/messages", require("./routes/messages"));
app.use("/uploads", express.static("uploads")); // permet d'accéder aux images
app.use("/api/upload", require("./routes/upload"));

// 🔹 Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://ybchat.netlify.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 🔹 Gestion des connexions utilisateurs
const connectedUsers = new Map(); // socket.id <-> userId

io.on("connection", (socket) => {
  console.log("🔌 Utilisateur connecté :", socket.id);

  // Quand un utilisateur rejoint avec son ID
  socket.on("join", async (userId) => {
    socket.userId = userId;
    connectedUsers.set(socket.id, userId);
    socket.join(userId);

    console.log(`👤 Utilisateur ${userId} est en ligne`);

    // Mettre à jour son statut en DB
    await User.findByIdAndUpdate(userId, { online: true });

    // Informer les autres
    socket.broadcast.emit("userOnline", { userId });
  });

  // Envoyer un message
  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    try {
      const newMessage = new Message({
        senderId,
        receiverId,
        message,
        seen: false,
      });
      await newMessage.save();

      // Émettre au destinataire
      io.to(receiverId).emit("receiveMessage", newMessage);
    } catch (err) {
      console.error("❌ Erreur lors de l’envoi du message :", err);
    }
  });

  // ✅ Relayer le statut "en train d’écrire"
  socket.on("typing", ({ from, to }) => {
    io.to(to).emit("typing", { from });
  });

  // Marquer les messages comme vus
  socket.on("markAsSeen", async ({ userId, friendId }) => {
    try {
      await Message.updateMany(
        { senderId: friendId, receiverId: userId, seen: false },
        { $set: { seen: true } }
      );

      // Informer l’ami que ses messages ont été lus
      io.to(friendId).emit("messagesSeen", { by: userId });
    } catch (err) {
      console.error("❌ Erreur lors du marquage vu :", err);
    }
  });

  // Déconnexion
  socket.on("disconnect", async () => {
    const userId = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);

    if (userId) {
      console.log(`❌ Utilisateur ${userId} déconnecté`);

      // Mettre à jour statut en DB
      await User.findByIdAndUpdate(userId, { online: false });

      // Prévenir les autres
      socket.broadcast.emit("userOffline", { userId });
    }
  });
});

// 🔹 Connexion MongoDB + lancement serveur
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connecté");

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Erreur MongoDB:", err);
    process.exit(1); // optionnel : arrête l'app si la DB ne se connecte pas
  });
