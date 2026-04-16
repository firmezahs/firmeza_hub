import express from "express";
import Developer from "../models/Developer.js";

const router = express.Router();

// LIST PAGE
router.get("/", async (req, res) => {
  try {
    const developers = await Developer.find().sort({ createdAt: -1 });

    res.render("developers/developers", {
      activePage: "developers",
      developers,
      query: req.query
    });
  } catch (err) {
    console.error(err);
    res.send("Error loading developers");
  }
});

// ADD PAGE
router.get("/add", (req, res) => {
  res.render("developers/addDeveloper", {
    activePage: "addDeveloper",
    emailExists: false,
    formData: {},
    developer: null
  });
});

// ADD HANDLE
router.post("/add", async (req, res) => {
  try {
    const { name, email, role } = req.body;

    const existing = await Developer.findOne({ email });

    if (existing) {
      return res.render("developers/addDeveloper", {
        activePage: "addDeveloper",
        emailExists: true,
        formData: { name, email, role },
        developer: null
      });
    }

    const count = await Developer.countDocuments();
    const dev_id = `#HS_D_${String(count + 1).padStart(3, "0")}`;

    await Developer.create({ dev_id, name, email, role });

    // ✅ FIX: toast trigger
    res.redirect("/developers?added=true");

  } catch (err) {
    console.error(err);
    res.send("Error creating developer");
  }
});

// DELETE
router.get("/delete/:id", async (req, res) => {
  try {
    await Developer.findByIdAndDelete(req.params.id);

    res.redirect("/developers?deleted=true");
  } catch (err) {
    console.error(err);
    res.redirect("/developers?error=true");
  }
});

// EDIT PAGE
router.get("/edit/:id", async (req, res) => {
  try {
    const developer = await Developer.findById(req.params.id);

    res.render("developers/addDeveloper", {
      activePage: "developers",
      isEdit: true,
      developer,
      emailExists: false,
      formData: developer
    });
  } catch (err) {
    console.error(err);
    res.send("Error loading developer");
  }
});

// UPDATE HANDLE
router.post("/edit/:id", async (req, res) => {
  try {
    const { name, email, role } = req.body;

    const existing = await Developer.findOne({
      email,
      _id: { $ne: req.params.id }
    });

    if (existing) {
      return res.render("developers/addDeveloper", {
        activePage: "developers",
        isEdit: true,
        emailExists: true,
        formData: { _id: req.params.id, name, email, role }
      });
    }

    await Developer.findByIdAndUpdate(req.params.id, {
      name,
      email,
      role
    });

    // ✅ FIX: toast trigger
    res.redirect("/developers?updated=true");

  } catch (err) {
    console.error(err);
    res.send("Error updating developer");
  }
});

// VIEW API
router.get("/view/:id", async (req, res) => {
  const dev = await Developer.findById(req.params.id);
  res.json(dev);
});

export default router;