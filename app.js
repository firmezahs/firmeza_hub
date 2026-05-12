import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import session from "express-session";
import multer from "multer";

// Routes
import authRoutes from "./routes/authRoutes.js";
import agreementRoutes from "./routes/agreementRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import developerRoutes from "./routes/developerRoutes.js";

// Middleware
import { requireAuth } from "./middleware/authMiddleware.js";

// Load env
dotenv.config({ path: "./config.env" });

const app = express();
const upload = multer({ dest: "uploads/" });

// =======================
// MIDDLEWARE
// =======================

// Active sidebar highlight
app.use((req, res, next) => {
  const p = req.path;
  if (p.startsWith("/clients"))    res.locals.activePage = "clients";
  else if (p.startsWith("/developers")) res.locals.activePage = "developers";
  else if (p.startsWith("/dashboard"))  res.locals.activePage = "dashboard";
  next();
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(
  session({
    secret: "firmeza-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  })
);

// ── GLOBAL USER ──────────────────────────────────────────────────────────────
// Builds res.locals.user with role for ALL routes so every EJS partial
// (especially the sidebar) always has access to user.role.
app.use((req, res, next) => {
  if (req.session?.user) {
    // Admin session → inject role: "admin"
    res.locals.user = { ...req.session.user, role: "admin" };
  } else if (req.session?.developer) {
    // Developer session → inject role: "developer" + developerId
    res.locals.user = {
      ...req.session.developer,
      role: "developer",
      developerId: req.session.developer._id
    };
  } else {
    res.locals.user = null;
  }
  next();
});

// Static files
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

// =======================
// DATABASE CONNECTION
// =======================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("❌ DB Error:", err);
    process.exit(1);
  });

// =======================
// ROUTES
// =======================

app.use("/auth",       authRoutes);
app.use("/clients",    clientRoutes);
app.use("/services",   serviceRoutes);
app.use("/developers", developerRoutes);

// Redirect root → login
app.get("/", (req, res) => res.redirect("/auth/login"));

// Health check
app.get("/health", (req, res) => res.send("Server is running ✅"));

// ── DASHBOARD ────────────────────────────────────────────────────────────────
// Use requireAuth so req.currentUser is set, then query counts for admin
import Client from "./models/Client.js";
import WorkUpdate from "./models/WorkUpdate.js";

app.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const user = req.currentUser;  // set by requireAuth

    let clientCount  = 0;
    let pendingCount = 0;

    if (user.role === "admin") {
      clientCount  = await Client.countDocuments();
      pendingCount = await WorkUpdate.countDocuments({ status: "Pending" });
    }

    res.render("dashboard", {
      activePage:   "dashboard",
      clientCount,
      pendingCount
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// =======================
// SERVER
// =======================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));