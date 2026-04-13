import express from "express";

const router = express.Router();

// Example route
router.get("/", (req, res) => {
  res.send("Agreements route working");
});

export default router;   // ✅ THIS LINE IS IMPORTANT