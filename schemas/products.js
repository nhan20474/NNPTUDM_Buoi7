let mongoose = require('mongoose');
let Inventory = require('./inventories');

let productSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            unique: true
        },
        slug: {
            type: String,
            required: true,
            unique: true
        },
        price: {
            type: Number,
            default: 0
        },
        description: {
            type: String,
            default: ""
        },
        category: {
            type: mongoose.Types.ObjectId,
            ref:'category',
            required: true
        },
        images: {
            type: [String],
            default: ["https://smithcodistributing.com/wp-content/themes/hello-elementor/assets/default_product.png"]
        },
        isDeleted:{
            type:Boolean,
            default:false
        }
    }, {
    timestamps: true
})

// Create (or ensure) corresponding Inventory document for each product.
// We upsert by `product` (Inventory has `unique: true` on product),
// so repeated saves (including updates) won't create duplicates.
productSchema.post('save', async function (doc) {
    await Inventory.findOneAndUpdate(
        { product: doc._id },
        { $setOnInsert: { product: doc._id } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
});

module.exports = mongoose.model('product', productSchema)