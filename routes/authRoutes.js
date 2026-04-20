import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// Show login page
router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("login");
});

// Handle login form
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("Login attempt:", email);

    const user = await User.findOne({ email });

    if (!user) {
      return res.render("login", { error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", { error: "Invalid password" });
    }

    // ✅ Save user in session
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email
    };

    return res.redirect("/dashboard");

  } catch (err) {
    console.error(err);
    res.render("login", { error: "Server error" });
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

export default router;