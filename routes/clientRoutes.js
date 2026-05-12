import express from "express";
import multer from "multer";
import Client from "../models/Client.js";
import Credential from "../models/Credentials.js";
import WorkUpdate from "../models/WorkUpdate.js";
import Document from "../models/Document.js";
import Projects from "../models/Projects.js";
import { Country } from "country-state-city";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Protect ALL client routes — sets req.currentUser and res.locals.user
router.use(requireAuth);

/* ─── GET ALL CLIENTS ───────────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  const user = req.currentUser;   // ← use req.currentUser, NOT req.session.user
  let clients;

  if (user.role === "admin") {
    clients = await Client.find().sort({ createdAt: -1 });
  } else {
    // Developer: only clients assigned to them
    clients = await Client.find({ developerId: user.developerId }).sort({ createdAt: -1 });
  }

  res.render("clients/clients", {
    clients,
    activePage: "clients",
    success: req.query.success,
    error: req.query.error
  });
});

/* ─── CHECK EMAIL (admin only) ──────────────────────────────────────────────── */
router.get("/check-email", requireAdmin, async (req, res) => {
  try {
    const { email, id } = req.query;
    if (!email) return res.json({ exists: false });
    const client = await Client.findOne({ email, _id: { $ne: id } });
    res.json({ exists: !!client });
  } catch (error) {
    console.error(error);
    res.json({ exists: false });
  }
});

/* ─── ADD CLIENT (admin only) ───────────────────────────────────────────────── */
router.get("/add", requireAdmin, (req, res) => {
  res.render("clients/addClient", {
    activePage: "addClient",
    emailExists: false,
    formData: {},
    countries: Country.getAllCountries()
  });
});

router.post("/add", requireAdmin, upload.single("logo"), async (req, res) => {
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
      name, companyName, mobileNumber, email, gstNumber, address, country,
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

/* ─── EDIT CLIENT (admin only) ──────────────────────────────────────────────── */
router.get("/edit/:id", requireAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.redirect("/clients?error=" + encodeURIComponent("Client not found"));

    res.render("clients/editClient", {
      client, activePage: "clients",
      error: null, emailExists: false,
      countries: Country.getAllCountries()
    });
  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Client not found"));
  }
});

router.post("/edit/:id", requireAdmin, upload.single("logo"), async (req, res) => {
  try {
    const { name, companyName, mobileNumber, email, gstNumber, address, country } = req.body;
    const existingClient = await Client.findOne({ email, _id: { $ne: req.params.id } });

    if (existingClient) {
      const client = await Client.findById(req.params.id);
      return res.render("clients/editClient", {
        client, activePage: "clients",
        error: "Email already exists", emailExists: true,
        countries: Country.getAllCountries()
      });
    }

    const updateData = { name, companyName, mobileNumber, email, gstNumber, address, country };
    if (req.body.removeLogo === "true") updateData.logo = null;
    if (req.file) updateData.logo = req.file.filename;

    await Client.findByIdAndUpdate(req.params.id, updateData);
    res.redirect("/clients?success=" + encodeURIComponent("Client updated successfully"));
  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Update failed"));
  }
});

/* ─── DELETE CLIENT (admin only) ────────────────────────────────────────────── */
router.get("/delete/:id", requireAdmin, async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.redirect("/clients?success=" + encodeURIComponent("Client deleted successfully"));
  } catch (error) {
    console.error(error);
    res.redirect("/clients?error=" + encodeURIComponent("Delete failed"));
  }
});

/* ─── VIEW CLIENT AJAX ──────────────────────────────────────────────────────── */
router.get("/view/:id", async (req, res) => {
  try {
    const user = req.currentUser;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: "Client not found" });

    // Developer can only view their assigned clients
    if (user.role === "developer" &&
        String(client.developerId) !== String(user.developerId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── VIEW PAGE (credentials / workupdate / documents / projects) ───────────── */
router.get("/view-page/:id", async (req, res) => {
  try {
    const user = req.currentUser;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).send("Client not found");

    // Developer: block access to clients not assigned to them
    if (user.role === "developer" &&
        String(client.developerId) !== String(user.developerId)) {
      return res.status(403).send("Access denied");
    }

    const tab = req.query.tab || "credentials";
    const projectId = req.query.projectId;

    let credentials, workupdates, documents, projects;

    if (user.role === "admin") {
      // Admin sees everything
      credentials = await Credential.find({ clientId: req.params.id }).sort({ createdAt: -1 });
      workupdates  = await WorkUpdate.find({ clientId: req.params.id }).sort({ createdAt: -1 });
      documents    = await Document.find({ clientId: req.params.id }).sort({ createdAt: -1 });
      projects     = await Projects.find({ clientId: req.params.id })
                       .populate("developer", "name dev_id")
                       .sort({ createdAt: -1 });
    } else {
      // Developer: only projects assigned to them
      projects = await Projects.find({
        clientId: req.params.id,
        developer: user.developerId
      }).populate("developer", "name dev_id").sort({ createdAt: -1 });

      // Credentials: all credentials of this assigned client
      credentials = await Credential.find({
        clientId: req.params.id
      }).sort({ createdAt: -1 });

      // Work updates: filtered by assigned projects only
      const assignedProjectIds = projects.map(p => p._id);
      workupdates = await WorkUpdate.find({
        clientId: req.params.id,
        projectId: { $in: assignedProjectIds }
      }).sort({ createdAt: -1 });

      // Documents: all documents of this assigned client
      documents = await Document.find({
        clientId: req.params.id
      }).sort({ createdAt: -1 });
    }

    let selectedProject = null;
    if (projectId) {
      selectedProject = await Projects.findOne({ _id: projectId, clientId: req.params.id });
    }

    // Group work updates by date
    const groupedUpdates = {};
    workupdates.forEach(item => {
      const date = new Date(item.date).toDateString();
      if (!groupedUpdates[date]) groupedUpdates[date] = [];
      groupedUpdates[date].push(item);
    });

    res.render("clients/viewDetails", {
      client,
      credentials:    credentials || [],
      workupdates:    workupdates || [],
      projects:       projects || [],
      selectedProject,
      groupedUpdates,
      documents,
      activePage: "clients",
      currentTab: tab
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/* ─── CREDENTIALS LIST ──────────────────────────────────────────────────────── */
router.get("/credentials/:id", async (req, res) => {
  try {
    const user = req.currentUser;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).send("Client not found");

    let credentials;
    if (user.role === "admin") {
      credentials = await Credential.find({ clientId: req.params.id }).sort({ createdAt: -1 });
    } else {
      // Developer: all credentials of their assigned client
      credentials = await Credential.find({
        clientId: req.params.id
      }).sort({ createdAt: -1 });
    }

    res.render("clients/credentials/credentials", {
      client, credentials, activePage: "clients"
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/* ─── ADD CREDENTIAL (admin only) ──────────────────────────────────────────── */
router.get("/credentials/add/:id", requireAdmin, async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).send("Client not found");

  // Pass projects so admin can pick which project this credential belongs to
  const projects = await Projects.find({ clientId: req.params.id }).sort({ createdAt: -1 });

  res.render("clients/credentials/addCredentials", {
    client, isEdit: false, credential: null, projects, activePage: "clients"
  });
});

router.post("/credentials/add/:id", requireAdmin, async (req, res) => {
  try {
    const { title, username, password, notes, projectId } = req.body;
    const newCredential = new Credential({
      clientId:  req.params.id,
      projectId: projectId || null,   // ← saved so developer filter works
      title, username, password, notes,
      has_2fa: req.body.has_2fa === "true" || req.body.has_2fa === "on"
    });
    await newCredential.save();
    res.redirect(`/clients/view-page/${req.params.id}?tab=credentials&success=created`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving credential");
  }
});

/* ─── DELETE CREDENTIAL (admin only) ───────────────────────────────────────── */
router.get("/credentials/delete/:id", requireAdmin, async (req, res) => {
  try {
    const credential = await Credential.findById(req.params.id);
    if (!credential) return res.redirect("/clients?error=" + encodeURIComponent("Credential not found"));
    await Credential.findByIdAndDelete(req.params.id);
    res.redirect("/clients/view-page/" + credential.clientId + "?tab=credentials&success=deleted");
  } catch (error) {
    console.error(error);
    res.redirect("/clients?error=" + encodeURIComponent("Delete failed"));
  }
});

/* ─── VIEW CREDENTIAL AJAX ──────────────────────────────────────────────────── */
router.get("/credentials/view/:id", async (req, res) => {
  try {
    const credential = await Credential.findById(req.params.id);
    if (!credential) return res.status(404).json({ error: "Credential not found" });
    res.json(credential);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── EDIT CREDENTIAL (admin only) ─────────────────────────────────────────── */
router.get("/credentials/edit/:id", requireAdmin, async (req, res) => {
  const credential = await Credential.findById(req.params.id);
  const client     = await Client.findById(credential.clientId);
  const projects   = await Projects.find({ clientId: credential.clientId }).sort({ createdAt: -1 });

  res.render("clients/credentials/addCredentials", {
    client, credential, isEdit: true, projects, activePage: "clients"
  });
});

router.post("/credentials/edit/:id", requireAdmin, async (req, res) => {
  try {
    const { title, username, password, notes, projectId } = req.body;
    const credential = await Credential.findById(req.params.id);
    await Credential.findByIdAndUpdate(req.params.id, {
      title, username, password, notes,
      projectId: projectId || null,
      has_2fa: req.body.has_2fa === "true" || req.body.has_2fa === "on"
    });
    res.redirect("/clients/view-page/" + credential.clientId + "?tab=credentials&success=updated");
  } catch (err) {
    res.redirect("/clients?error=" + encodeURIComponent("Update failed"));
  }
});

/* ─── ADD WORK UPDATE (admin only) ─────────────────────────────────────────── */
router.get("/workupdate/add/:id", requireAdmin, async (req, res) => {
  try {
    const client   = await Client.findById(req.params.id);
    if (!client) return res.status(404).send("Client not found");
    const projects = await Projects.find({ clientId: req.params.id }).sort({ createdAt: -1 });
    res.render("clients/workupdate/addWorkUpdate", {
      client, isEdit: false, work: null, projects
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post("/workupdate/add/:id", requireAdmin, async (req, res) => {
  try {
    const { title, description, date, status, projectId } = req.body;
    const newWork = new WorkUpdate({
      clientId:  req.params.id,
      projectId: projectId || null,   // ← saved so developer filter works
      title, description, date, status
    });
    await newWork.save();
    res.redirect("/clients/view-page/" + req.params.id + "?tab=workupdate");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving work update");
  }
});

/* ─── DELETE WORK UPDATE (admin only) ──────────────────────────────────────── */
router.get("/workupdate/delete/:id", requireAdmin, async (req, res) => {
  try {
    const work = await WorkUpdate.findById(req.params.id);
    if (!work) return res.redirect("/clients?error=" + encodeURIComponent("Work update not found"));
    await WorkUpdate.findByIdAndDelete(req.params.id);
    res.redirect("/clients/view-page/" + work.clientId +
      "?tab=workupdate&success=" + encodeURIComponent("Work update deleted successfully"));
  } catch (error) {
    console.error(error);
    res.redirect("/clients?error=" + encodeURIComponent("Delete failed"));
  }
});

/* ─── EDIT WORK UPDATE (admin only) ────────────────────────────────────────── */
router.get("/workupdate/edit/:id", requireAdmin, async (req, res) => {
  try {
    const work = await WorkUpdate.findById(req.params.id);
    if (!work) return res.redirect("/clients?error=" + encodeURIComponent("Work update not found"));
    const client   = await Client.findById(work.clientId);
    const projects = await Projects.find({ clientId: work.clientId }).sort({ createdAt: -1 });
    res.render("clients/workupdate/addWorkUpdate", { client, work, isEdit: true, projects });
  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Error loading work update"));
  }
});

router.post("/workupdate/edit/:id", requireAdmin, async (req, res) => {
  try {
    const { title, description, date, status, projectId } = req.body;
    const work = await WorkUpdate.findById(req.params.id);
    if (!work) return res.redirect("/clients?error=" + encodeURIComponent("Work update not found"));
    await WorkUpdate.findByIdAndUpdate(req.params.id, {
      title, description, date, status,
      projectId: projectId || null
    });
    res.redirect("/clients/view-page/" + work.clientId +
      "?tab=workupdate&success=" + encodeURIComponent("Work update updated successfully"));
  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Update failed"));
  }
});

/* ─── ADD DOCUMENTS (admin only) ───────────────────────────────────────────── */
router.post("/documents/add/:id", requireAdmin, upload.array("files", 5), async (req, res) => {
  try {
    const files = req.files;
    const { projectId } = req.body;
    if (!files || files.length === 0) return res.send("No files uploaded");

    const docs = files.map(file => ({
      clientId:  req.params.id,
      projectId: projectId || null,   // ← saved so developer filter works
      fileName:  file.originalname,
      filePath:  file.filename
    }));

    await Document.insertMany(docs);
    res.redirect(`/clients/view-page/${req.params.id}?tab=documents&success=uploaded`);
  } catch (err) {
    console.error(err);
    res.send("Upload failed");
  }
});

/* ─── DELETE DOCUMENT (admin only) ─────────────────────────────────────────── */
router.get("/documents/delete/:id", requireAdmin, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.redirect("/clients?error=Not found");
    await Document.findByIdAndDelete(req.params.id);
    res.redirect(`/clients/view-page/${doc.clientId}?tab=documents&success=doc_deleted`);
  } catch (err) {
    res.send("Delete failed");
  }
});

router.get("/documents/review/:id", requireAdmin, async (req, res) => {
  const client = await Client.findById(req.params.id);
  const files  = req.session?.pendingFiles || [];
  res.render("clients/documents/reviewDocuments", {
    client, files, activePage: "clients", user: req.currentUser
  });
});

router.post("/documents/confirm-upload/:id", requireAdmin, async (req, res) => {
  try {
    const files = req.session.pendingFiles || [];
    let { customNames, projectId } = req.body;
    if (!files.length) return res.send("No files to upload");
    if (!Array.isArray(customNames)) customNames = [customNames];

    const docs = files.map((file, index) => ({
      clientId:  req.params.id,
      projectId: projectId || null,
      fileName:  customNames[index] || file.originalname,
      filePath:  file.filename
    }));

    await Document.insertMany(docs);
    req.session.pendingFiles = [];
    res.redirect(`/clients/view-page/${req.params.id}?tab=documents&success=uploaded`);
  } catch (err) {
    console.error(err);
    res.send("Upload failed");
  }
});

router.get("/documents/remove-temp/:clientId/:index", requireAdmin, (req, res) => {
  const index = parseInt(req.params.index);
  if (req.session.pendingFiles) req.session.pendingFiles.splice(index, 1);
  res.redirect(`/clients/documents/review/${req.params.clientId}`);
});

router.post("/documents/review/:id", requireAdmin, upload.array("files", 5), (req, res) => {
  try {
    req.session.pendingFiles = req.files;
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

/* ─── ADD PROJECT (admin only) ──────────────────────────────────────────────── */
router.get("/projects/add/:id", requireAdmin, async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).send("Client not found");

  res.render("clients/projects/addProject", {
    client, project: null, isEdit: false, activePage: "clients"
  });
});

router.post("/projects/add/:id", requireAdmin, async (req, res) => {
  try {
    const { title, description, developer } = req.body;
    await Projects.create({
      clientId: req.params.id, title, description,
      developer: developer || null
    });
    res.redirect(`/clients/view-page/${req.params.id}?tab=projects&success=created`);
  } catch (err) {
    console.error(err);
    res.send("Error saving project");
  }
});

/* ─── DELETE PROJECT (admin only) ───────────────────────────────────────────── */
router.get("/projects/delete/:id", requireAdmin, async (req, res) => {
  try {
    const project = await Projects.findById(req.params.id);
    if (!project) return res.redirect("/clients?error=" + encodeURIComponent("Project not found"));
    const clientId = project.clientId;
    await Projects.findByIdAndDelete(req.params.id);
    res.redirect("/clients/view-page/" + clientId + "?tab=projects&success=deleted");
  } catch (error) {
    console.error(error);
    res.redirect("/clients?error=" + encodeURIComponent("Delete failed"));
  }
});

/* ─── EDIT PROJECT (admin only) ─────────────────────────────────────────────── */
router.get("/projects/edit/:id", requireAdmin, async (req, res) => {
  try {
    const project = await Projects.findById(req.params.id);
    if (!project) return res.redirect("/clients?error=" + encodeURIComponent("Project not found"));
    const client = await Client.findById(project.clientId);
    res.render("clients/projects/addProject", {
      client, project, isEdit: true, activePage: "clients"
    });
  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Error loading project"));
  }
});

router.post("/projects/edit/:id", requireAdmin, async (req, res) => {
  try {
    const { title, description, developer } = req.body;
    const project = await Projects.findById(req.params.id);
    if (!project) return res.redirect("/clients?error=" + encodeURIComponent("Project not found"));
    await Projects.findByIdAndUpdate(req.params.id, {
      title, description, developer: developer || null
    });
    res.redirect("/clients/view-page/" + project.clientId + "?tab=projects&success=updated");
  } catch (err) {
    console.error(err);
    res.redirect("/clients?error=" + encodeURIComponent("Update failed"));
  }
});

export default router;