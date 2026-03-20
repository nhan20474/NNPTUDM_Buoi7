var express = require('express');
var router = express.Router();

let mongoose = require('mongoose');
let inventoryModel = require('../schemas/inventories');
let productModel = require('../schemas/products');

function parsePositiveInt(value) {
  let n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Use integer quantities; avoid float stock values.
  return Math.floor(n);
}

router.get('/', async function (req, res, next) {
  let data = await inventoryModel.find({}).populate({ path: 'product' });
  res.send(data);
});

// GET inventory by inventory _id (join with product)
router.get('/:id', async function (req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'INVALID INVENTORY ID' });
    }

    let result = await inventoryModel
      .findById(id)
      .populate({ path: 'product' });

    if (!result) {
      return res.status(404).send({ message: 'INVENTORY NOT FOUND' });
    }

    res.send(result);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST tăng stock: { product, quantity }
router.post('/add-stock', async function (req, res, next) {
  try {
    let { product, quantity } = req.body;
    if (!product || !mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).send({ message: 'INVALID PRODUCT' });
    }

    let qty = parsePositiveInt(quantity);
    if (qty === null) {
      return res.status(400).send({ message: 'INVALID QUANTITY' });
    }

    let productExists = await productModel.findOne({ _id: product, isDeleted: false });
    if (!productExists) {
      return res.status(404).send({ message: 'PRODUCT NOT FOUND' });
    }

    let updated = await inventoryModel.findOneAndUpdate(
      { product },
      {
        $setOnInsert: { product },
        $inc: { stock: qty },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST giảm stock: { product, quantity }
router.post('/remove-stock', async function (req, res, next) {
  try {
    let { product, quantity } = req.body;
    if (!product || !mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).send({ message: 'INVALID PRODUCT' });
    }

    let qty = parsePositiveInt(quantity);
    if (qty === null) {
      return res.status(400).send({ message: 'INVALID QUANTITY' });
    }

    let updated = await inventoryModel.findOneAndUpdate(
      { product, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    );

    if (!updated) {
      return res.status(400).send({ message: 'INSUFFICIENT STOCK OR INVENTORY NOT FOUND' });
    }

    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST reservation: { product, quantity } => stock - qty, reserved + qty
router.post('/reservation', async function (req, res, next) {
  try {
    let { product, quantity } = req.body;
    if (!product || !mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).send({ message: 'INVALID PRODUCT' });
    }

    let qty = parsePositiveInt(quantity);
    if (qty === null) {
      return res.status(400).send({ message: 'INVALID QUANTITY' });
    }

    let updated = await inventoryModel.findOneAndUpdate(
      { product, stock: { $gte: qty } },
      { $inc: { stock: -qty, reserved: qty } },
      { new: true }
    );

    if (!updated) {
      return res.status(400).send({ message: 'INSUFFICIENT STOCK OR INVENTORY NOT FOUND' });
    }

    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST sold: { product, quantity } => reserved - qty, soldCount + qty
router.post('/sold', async function (req, res, next) {
  try {
    let { product, quantity } = req.body;
    if (!product || !mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).send({ message: 'INVALID PRODUCT' });
    }

    let qty = parsePositiveInt(quantity);
    if (qty === null) {
      return res.status(400).send({ message: 'INVALID QUANTITY' });
    }

    let updated = await inventoryModel.findOneAndUpdate(
      { product, reserved: { $gte: qty } },
      { $inc: { reserved: -qty, soldCount: qty } },
      { new: true }
    );

    if (!updated) {
      return res.status(400).send({ message: 'INSUFFICIENT RESERVED OR INVENTORY NOT FOUND' });
    }

    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;

