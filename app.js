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

// Load env
dotenv.config({ path: "./config.env" });

const app = express();
const upload = multer({ dest: "uploads/" });

// =======================
// MIDDLEWARE
// =======================

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
app.use(
  session({
    secret: "firmeza-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // true only in HTTPS
  })
);


// Static files (CSS, JS, images)
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// View engine (EJS)
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
app.use("/agreements", agreementRoutes);
app.use("/clients", clientRoutes);

// Frontend routes
app.get("/", (req, res) => {
  res.render("index");
});

// Health check
app.get("/health", (req, res) => {
  res.send("Server is running ✅");
});
app.get("/dashboard", (req, res) => {
  res.render("dashboard", {
    user: { name: "Demo User" } // temporary
  });
});

app.get("/developers", (req, res) => {
  res.render("developers/developers", {
    activePage: "developers"   // 👈 ADD THIS
  });
});

app.use((req, res, next) => {
  // Don't attach user for login page
  if (req.path.startsWith('/auth')) {
    return next();
  }

  res.locals.user = req.user || req.session?.user || null;
  next();
});

// =======================
// SERVER
// =======================


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});