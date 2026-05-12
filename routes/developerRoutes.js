import express from "express";
import Developer from "../models/Developer.js";
import Client from "../models/Client.js";
import Project from "../models/Projects.js";

const router = express.Router();

// LOGOUT
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

/*DEVELOPERS LIST*/

// LIST PAGE
router.get("/", async (req, res) => {
  try {
    const developers = await Developer.find()
      .sort({ createdAt: -1 })
      .lean();

    for (let dev of developers) {
      dev.clientCount = await Client.countDocuments({
        developerId: dev._id
      });
    }

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

/*ADD DEVELOPER*/

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

    await Developer.create({
      dev_id,
      name,
      email,
      role
    });

    res.redirect("/developers?added=true");

  } catch (err) {
    console.error(err);
    res.send("Error creating developer");
  }
});

/*DELETE*/

router.get("/delete/:id", async (req, res) => {
  try {
    await Developer.findByIdAndDelete(req.params.id);

    res.redirect("/developers?deleted=true");

  } catch (err) {
    console.error(err);
    res.redirect("/developers?error=true");
  }
});

/*EDIT*/

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
        formData: {
          _id: req.params.id,
          name,
          email,
          role
        }
      });
    }

    await Developer.findByIdAndUpdate(req.params.id, {
      name,
      email,
      role
    });

    res.redirect("/developers?updated=true");

  } catch (err) {
    console.error(err);
    res.send("Error updating developer");
  }
});

/*VIEW API*/

router.get("/view/:id", async (req, res) => {
  const dev = await Developer.findById(req.params.id);
  res.json(dev);
});

/*CLIENTS OF DEVELOPER*/

// GET ALL CLIENTS
router.get("/:id/clients", async (req, res) => {
  try {
    const devId = req.params.id;

    const clients = await Client.find()
      .sort({ createdAt: -1 })
      .lean();

    const assignedClients = await Client.find({
      developerId: devId
    }).select("_id");

    const assignedIds = assignedClients.map(c => c._id.toString());

    for (let client of clients) {
      const projects = await Project.find({
        clientId: client._id
      }).lean();

      client.projects = projects;
      client.assigned = assignedIds.includes(client._id.toString());
    }

    res.json(clients);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching clients");
  }
});

/*ASSIGN CLIENTS / PROJECTS*/

router.post("/:id/assign-clients", async (req, res) => {
  try {
    const devId = req.params.id;
    const { clientIds = [], projectIds = [] } = req.body;

    // remove developer from previous clients
    await Client.updateMany(
      { developerId: devId },
      { $unset: { developerId: "" } }
    );

    // assign selected clients
    await Client.updateMany(
      { _id: { $in: clientIds } },
      { $set: { developerId: devId } }
    );

    // remove developer from all previously assigned projects
    await Project.updateMany(
      { developer: devId },
      { $unset: { developer: "" } }
    );

    // assign selected projects only
    if (projectIds.length) {
      await Project.updateMany(
        { _id: { $in: projectIds } },
        { $set: { developer: devId } }
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating clients/projects");
  }
});

export default router;