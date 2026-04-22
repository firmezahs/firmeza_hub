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

// Load env
dotenv.config({ path: "./config.env" });

const app = express();
const upload = multer({ dest: "uploads/" });

// =======================
// MIDDLEWARE
// =======================

// Active sidebar highlight
app.use((req, res, next) => {
  const path = req.path;

  if (path.startsWith("/clients")) res.locals.activePage = "clients";
  else if (path.startsWith("/developers")) res.locals.activePage = "developers";
  else if (path.startsWith("/dashboard")) res.locals.activePage = "dashboard";

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
    cookie: { secure: false } // true only in HTTPS
  })
);

// ✅ GLOBAL USER (FIXED POSITION)
app.use((req, res, next) => {
  // Skip auth pages
  if (req.path.startsWith("/auth")) {
    return next();
  }

  // Make user available in all EJS views
  res.locals.user = req.session?.user || null;

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

// API routes
app.use("/auth", authRoutes);
app.use("/clients", clientRoutes);
app.use("/services", serviceRoutes);
app.use("/developers", developerRoutes);

// Redirect root → login
app.get("/", (req, res) => {
  res.redirect("/auth/login");
});

// Health check
app.get("/health", (req, res) => {
  res.send("Server is running ✅");
});

// ✅ Dashboard (FIXED)
app.get("/dashboard", (req, res) => {
  // Optional protection
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

  res.render("dashboard"); // user comes from res.locals
});

// =======================
// SERVER
// =======================


const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});