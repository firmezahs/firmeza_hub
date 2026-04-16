import express from 'express';
import Service from "../models/Service.js";

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });

    res.render('services/services', { services }); 
  } catch (err) {
    console.error(err);
    res.send("Error loading services");
  }
});

router.get('/add', (req, res) => {
  res.render('services/addServices', { service: null });
});

router.post('/add', async (req, res) => {
  try {
    const { name } = req.body;

    await Service.create({ name });

    res.redirect('/services'); // go back after save
  } catch (err) {
    res.send(err.message);
  }
});

router.get('/edit/:id', async (req, res) => {
  const service = await Service.findById(req.params.id);
  res.render('services/addServices', { service });
});

router.post('/update/:id', async (req, res) => {
  await Service.findByIdAndUpdate(req.params.id, {
    name: req.body.name
  });
  res.redirect('/services');
});

router.get('/delete/:id', async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.redirect('/services');
});

export default router;