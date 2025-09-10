const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const token = req.header("Authorization")?.split(" ")[1]; // "Bearer token"
  if (!token) return res.status(401).json({ msg: "Accès refusé" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contient { id: user._id }
    next();
  } catch (err) {
    res.status(400).json({ msg: "Token invalide" });
  }
}

module.exports = auth;
