import express from "express";
import multer from "multer";
import Client from "../models/Client.js";
import Credential from "../models/Credentials.js";
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

/* VIEW PAGE (WITH CREDENTIALS) */
router.get("/view-page/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).send("Client not found");
    }

    const isPartial = req.query.partial === "true";

    const credentials = await Credential.find({
      clientId: req.params.id
    }).sort({ createdAt: -1 });

    res.render("clients/viewDetails", {
      client,
      credentials,
      activePage: "clients",
      isPartial,
      query: req.query
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

export default router;