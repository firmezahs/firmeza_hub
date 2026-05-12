import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Developer from "../models/Developer.js";
import Client from "../models/Client.js";
import WorkUpdate from "../models/WorkUpdate.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Login page
router.get("/login", (req, res) => {
  if (req.session.user || req.session.developer) {
    return res.redirect("/dashboard");
  }
  res.render("login", { error: null, formData: {} });
});

// Login handler
router.post("/login", async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const password = req.body.password;

  try {
    // ADMIN LOGIN
    const user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        req.session.user = {
          _id: user._id,
          name: user.name,
          email: user.email
        };
        return res.redirect("/dashboard");
      }
    }

    // DEVELOPER LOGIN
    const developer = await Developer.findOne({ email, status: "active" });
    if (developer && password === "123456") {
      req.session.developer = {
        _id: developer._id,
        dev_id: developer.dev_id,
        name: developer.name,
        email: developer.email,
        role: developer.role
      };
      return res.redirect("/dashboard");
    }

    return res.render("login", { error: "Invalid email or password", formData: { email } });

  } catch (err) {
    console.error(err);
    return res.render("login", { error: "Server error", formData: { email } });
  }
});

// Dashboard
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const user = req.currentUser;
    let clientCount = 0;
    let pendingCount = 0;

    if (user.role === "admin") {
      clientCount  = await Client.countDocuments();
      pendingCount = await WorkUpdate.countDocuments({ status: "pending" });
    }

    res.render("dashboard", {
      activePage: "dashboard",
      clientCount,
      pendingCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

export default router;