import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// Show login page
router.get("/login", (req, res) => {
  res.render("login");
});

// Handle login form
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("Login attempt:", email);

    // 🔍 Find user in DB
    const user = await User.findOne({ email });

    if (!user) {
      return res.send("User not found ❌");
    }

    // 🔐 Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.send("Invalid password ❌");
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
    res.send("Server error ❌");
  }
});

// Logout route
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

export default router;