import express from "express";
import multer from "multer";
import Client from "../models/Client.js";
import Credential from "../models/Credentials.js";
import WorkUpdate from "../models/WorkUpdate.js";
import Document from "../models/Document.js";
import Projects from "../models/Projects.js";
import { Country } from "country-state-city";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/*GET ALL CLIENTS*/
router.get("/", async (req, res) => {
  const clients = await Client.find().sort({ createdAt: -1 });

  res.render("clients/clients", {
    clients,
    activePage: "clients",
    success: req.query.success,
    error: req.query.error
  });
});

/* CHECK EMAIL (ADD + EDIT) */
router.get("/check-email", async (req, res) => {
  try {
    const { email, id } = req.query;

    if (!email) {
      return res.json({ exists: false });
    }

    const client = await Client.findOne({
      email,
      _id: { $ne: id }
    });

    res.json({ exists: !!client });
  } catch (error) {
    console.error(error);
    res.json({ exists: false });
  }
});

/*ADD CLIENT */
router.get("/add", (req, res) => {
  res.render("clients/addClient", {
    activePage: "addClient",
    emailExists: false,
    formData: {},
    countries: Country.getAllCountries()
  });
});

router.post("/add", upload.single("logo"), async (req, res) => {
  try {
    const { name, companyName, mobileNumber, email, gstNumber, address, country } = req.body;

    const existingClient = await Client.findOne({ email });

    if (existingClient) {
      return res.render("clients/addClient", {
        activePage: "addClient",
        emailExists: true,
        formData: req.body,
        countries: Country.getAllCountries()
      });
    }

    const lastClient = await Client.findOne().sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastClient && lastClient.clientId) {
      const lastNumber = parseInt(lastClient.clientId.split("_").pop());
      nextNumber = lastNumber + 1;
    }

    const formattedId = `HS_C_${String(nextNumber).padStart(3, "0")}`;

    const newClient = new Client({
      clientId: formattedId,
      name,
      companyName,
      mobileNumber,
      email,
      gstNumber,
      address,
      country,
      logo: req.file ? req.file.filename : null
    });

    await newClient.save();

    res.redirect("/clients?success=" + encodeURIComponent("Client added successfully"));
  } catch (error) {
    console.error(error);
    res.render("clients/addClient", {
      activePage: "addClient",
      emailExists: false,
      formData: req.body,
      countries: Country.getAllCountries()
    });
  }
});

/* EDIT CLIENT (GET)*/
router.get("/edit/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.redirect("/clients?error=" + encodeURIComponent("Client not found"));
    }

    res.render("clients/editClient", {
      client,
      activePage: "clients",
      error: null,
      emailExists: false,
      countries: Country.getAllCountries()
    });
  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Client not found"));
  }
});

/* EDIT CLIENT (POST)*/
router.post("/edit/:id", upload.single("logo"), async (req, res) => {
  try {
    const { name, companyName, mobileNumber, email, gstNumber, address, country } = req.body;

    const existingClient = await Client.findOne({
      email,
      _id: { $ne: req.params.id }
    });

    if (existingClient) {
      const client = await Client.findById(req.params.id);

      return res.render("clients/editClient", {
        client,
        activePage: "clients",
        error: "Email already exists",
        emailExists: true,
        countries: Country.getAllCountries()
      });
    }

    const updateData = {
      name,
      companyName,
      mobileNumber,
      email,
      gstNumber,
      address,
      country
    };

    if (req.body.removeLogo === "true") {
      updateData.logo = null;
    }

    if (req.file) {
      updateData.logo = req.file.filename;
    }

    await Client.findByIdAndUpdate(req.params.id, updateData);

    res.redirect("/clients?success=" + encodeURIComponent("Client updated successfully"));
  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Update failed"));
  }
});

/*DELETE CLIENT*/
router.get("/delete/:id", async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);

    res.redirect("/clients?success=" + encodeURIComponent("Client deleted successfully"));
  } catch (error) {
    console.error(error);
    res.redirect("/clients?error=" + encodeURIComponent("Delete failed"));
  }
});

/* VIEW CLIENT (AJAX)*/
router.get("/view/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* VIEW PAGE (WITH CREDENTIALS + WORKUPDATE) */
router.get("/view-page/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).send("Client not found");

    const tab = req.query.tab || "credentials";

    const credentials = await Credential.find({ clientId: req.params.id })
      .sort({ createdAt: -1 });

    const workupdates = await WorkUpdate.find({ clientId: req.params.id })
      .sort({ createdAt: -1 });

    const documents = await Document.find({ clientId: req.params.id })
      .sort({ createdAt: -1 });

    // ✅ FIX HERE
    const projects = await Projects.find({ clientId: req.params.id })
      .sort({ createdAt: -1 });

    // GROUP WORK UPDATES
    const groupedUpdates = {};
    workupdates.forEach(item => {
      const date = new Date(item.date).toDateString();
      if (!groupedUpdates[date]) {
        groupedUpdates[date] = [];
      }
      groupedUpdates[date].push(item);
    });

    res.render("clients/viewDetails", {
      client,
      credentials: credentials || [],
      workupdates: workupdates || [],
      projects: projects || [], // ✅ IMPORTANT
      groupedUpdates,
      documents,
      activePage: "clients",
      tab
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.get("/credentials/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).send("Client not found");
    }

    const credentials = await Credential.find({
      clientId: req.params.id
    }).sort({ createdAt: -1 });

    res.render("clients/credentials/credentials", {
      client,
      credentials,
      activePage: "clients"
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/* ADD CREDENTIAL PAGE */
router.get("/credentials/add/:id", async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) return res.status(404).send("Client not found");

  res.render("clients/credentials/addCredentials", {
    client,
    isEdit: false,       // ✅ FIX ADDED
    credential: null,    // ✅ SAFE DEFAULT
    activePage: "clients"
  });
});

router.post("/credentials/add/:id", async (req, res) => {
  try {
    const { title, username, password, notes } = req.body;

    const newCredential = new Credential({
      clientId: req.params.id,
      title,
      username,
      password,
      notes,
      has_2fa: req.body.has_2fa === "true" || req.body.has_2fa === "on"
    });

    await newCredential.save();

    res.redirect(`/clients/view-page/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving credential");
  }
});

router.get("/credentials/delete/:id", async (req, res) => {
  try {
    const credential = await Credential.findById(req.params.id);

    if (!credential) {
      return res.redirect("/clients?error=" + encodeURIComponent("Credential not found"));
    }

    await Credential.findByIdAndDelete(req.params.id);

    res.redirect(
      "/clients/view-page/" + credential.clientId +
      "?error=" + encodeURIComponent("Credential deleted successfully")
    );

  } catch (error) {
    console.error(error);
    res.redirect("/clients?error=" + encodeURIComponent("Delete failed"));
  }
});

router.get("/credentials/view/:id", async (req, res) => {
  try {
    const credential = await Credential.findById(req.params.id);

    if (!credential) {
      return res.status(404).json({ error: "Credential not found" });
    }

    res.json(credential);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/credentials/edit/:id", async (req, res) => {
  const credential = await Credential.findById(req.params.id);
  const client = await Client.findById(credential.clientId);

  res.render("clients/credentials/addCredentials", {
    client,
    credential,
    isEdit: true,
    activePage: "clients"
  });
});

/* UPDATE CREDENTIAL */
router.post("/credentials/edit/:id", async (req, res) => {
  try {
    const { title, username, password, notes } = req.body;

    const credential = await Credential.findById(req.params.id);

    await Credential.findByIdAndUpdate(req.params.id, {
      title,
      username,
      password,
      notes,
      has_2fa: req.body.has_2fa === "true" || req.body.has_2fa === "on"
    });

    res.redirect(
      "/clients/view-page/" + credential.clientId +
      "?success=" + encodeURIComponent("Credential updated successfully")
    );
  } catch (err) {
    res.redirect("/clients?error=" + encodeURIComponent("Update failed"));
  }
});

/* ADD WORK UPDATE PAGE */
router.get("/workupdate/add/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).send("Client not found");
    }

    res.render("clients/workupdate/addWorkUpdate", {
      client,
      isEdit: false,
      work: null
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


/* SAVE WORK UPDATE */
router.post("/workupdate/add/:id", async (req, res) => {
  try {
    const { title, description, date, status } = req.body;

    const newWork = new WorkUpdate({
      clientId: req.params.id,
      title,
      description,
      date,
      status
    });

    await newWork.save();

    res.redirect("/clients/view-page/" + req.params.id + "?tab=workupdate");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving work update");
  }
});

// DELETE WORK UPDATE
router.get("/workupdate/delete/:id", async (req, res) => {
  try {
    const work = await WorkUpdate.findById(req.params.id);

    if (!work) {
      return res.redirect("/clients?error=" + encodeURIComponent("Work update not found"));
    }

    await WorkUpdate.findByIdAndDelete(req.params.id);

    res.redirect(
      "/clients/view-page/" + work.clientId +
      "?tab=workupdate&success=" + encodeURIComponent("Work update deleted successfully")
    );

  } catch (error) {
    console.error(error);
    res.redirect("/clients?error=" + encodeURIComponent("Delete failed"));
  }
});

router.get("/workupdate/edit/:id", async (req, res) => {
  try {
    const work = await WorkUpdate.findById(req.params.id);

    if (!work) {
      return res.redirect("/clients?error=" + encodeURIComponent("Work update not found"));
    }

    const client = await Client.findById(work.clientId);

    res.render("clients/workupdate/addWorkUpdate", {
      client,
      work,
      isEdit: true   // 🔥 THIS triggers edit mode
    });

  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Error loading work update"));
  }
});

router.post("/workupdate/edit/:id", async (req, res) => {
  try {
    const { title, description, date, status } = req.body;

    const work = await WorkUpdate.findById(req.params.id);

    if (!work) {
      return res.redirect("/clients?error=" + encodeURIComponent("Work update not found"));
    }

    await WorkUpdate.findByIdAndUpdate(req.params.id, {
      title,
      description,
      date,
      status
    });

    res.redirect(
      "/clients/view-page/" + work.clientId +
      "?tab=workupdate&success=" + encodeURIComponent("Work update updated successfully")
    );

  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Update failed"));
  }
});

router.post("/documents/add/:id", upload.array("files", 5), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.send("No files uploaded");
    }

    const docs = files.map(file => ({
      clientId: req.params.id,
      fileName: file.originalname,
      filePath: file.filename
    }));

    await Document.insertMany(docs);

    res.redirect(`/clients/view-page/${req.params.id}?tab=documents`);
  } catch (err) {
    console.error(err);
    res.send("Upload failed");
  }
});

router.get("/documents/delete/:id", async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    await Document.findByIdAndDelete(req.params.id);

    res.redirect(`/clients/view-page/${doc.clientId}?tab=documents`);
  } catch (err) {
    res.send("Delete failed");
  }
});

router.get("/documents/review/:id", async (req, res) => {
  const client = await Client.findById(req.params.id);

  const files = req.session?.pendingFiles || [];

  res.render("clients/documents/reviewDocuments", {
    client,
    files,
    activePage: "clients",
    user: req.user
  });
});

router.post("/documents/confirm-upload/:id", async (req, res) => {
  try {
    const files = req.session.pendingFiles || [];
    let { customNames } = req.body;

    if (!files.length) {
      return res.send("No files to upload");
    }

    // ensure array
    if (!Array.isArray(customNames)) {
      customNames = [customNames];
    }

    const docs = files.map((file, index) => ({
      clientId: req.params.id,
      fileName: customNames[index] || file.originalname,
      filePath: file.filename
    }));

    await Document.insertMany(docs);

    req.session.pendingFiles = []; // clear session

    res.redirect(`/clients/view-page/${req.params.id}?tab=documents`);
  } catch (err) {
    console.error(err);
    res.send("Upload failed");
  }
});

router.get("/documents/remove-temp/:index", (req, res) => {
  const index = parseInt(req.params.index);

  if (req.session.pendingFiles) {
    req.session.pendingFiles.splice(index, 1);
  }

  res.redirect("back");
});

// ✅ STORE FILES TEMPORARILY FOR REVIEW
router.post("/documents/review/:id", upload.array("files", 5), (req, res) => {
  try {
    req.session.pendingFiles = req.files; // store multer files
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.get("/projects/add/:id", async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) return res.status(404).send("Client not found");

  res.render("clients/projects/addProject", {
    client,
    project: null,   // ✅ ADD THIS FIX
    isEdit: false,
    activePage: "clients"
  });
});

router.post("/projects/add/:id", async (req, res) => {
  try {
    const { title, description, developer } = req.body;

    await Projects.create({
      clientId: req.params.id,
      title,
      description,
      developer: developer?.trim() ? developer.trim() : "Not Assigned"
    });

    res.redirect(`/clients/view-page/${req.params.id}?tab=projects`);

  } catch (err) {
    console.error(err);
    res.send("Error saving project");
  }
});

router.get("/projects/delete/:id", async (req, res) => {
  try {
    const project = await Projects.findById(req.params.id);

    if (!project) {
      return res.redirect(
        "/clients?error=" + encodeURIComponent("Project not found")
      );
    }

    const clientId = project.clientId;

    await Projects.findByIdAndDelete(req.params.id);

    res.redirect(
      "/clients/view-page/" +
        clientId +
        "?tab=projects&success=" +
        encodeURIComponent("Project deleted successfully")
    );

  } catch (error) {
    console.error(error);

    res.redirect(
      "/clients?error=" + encodeURIComponent("Delete failed")
    );
  }
});

router.get("/projects/edit/:id", async (req, res) => {
  try {
    const project = await Projects.findById(req.params.id);

    if (!project) {
      return res.redirect("/clients?error=" + encodeURIComponent("Project not found"));
    }

    const client = await Client.findById(project.clientId);

    res.render("clients/projects/addProject", {
      client,
      project,      // 👈 IMPORTANT (edit mode data)
      isEdit: true,
      activePage: "clients"
    });

  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Error loading project"));
  }
});

router.post("/projects/edit/:id", async (req, res) => {
  try {
    const { title, description, developer } = req.body;

    const project = await Projects.findById(req.params.id);

    if (!project) {
      return res.redirect("/clients?error=" + encodeURIComponent("Project not found"));
    }

    await Projects.findByIdAndUpdate(req.params.id, {
      title,
      description,
      developer: developer?.trim() ? developer : "Not Assigned"
    });

    res.redirect(
      "/clients/view-page/" +
        project.clientId +
        "?tab=projects&success=" +
        encodeURIComponent("Project updated successfully")
    );

  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Update failed"));
  }
});

export default router;