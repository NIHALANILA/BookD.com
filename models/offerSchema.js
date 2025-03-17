const mongoose = require('mongoose');
const { Schema } = mongoose;

const offerSchema = new Schema({

    name: {
        type: String,
        required: true,
        trim: true,
    },


    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null, 
    },
    book_ids: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book",
        }
    ],
    min_purchase_amount: { type: Number, default: 0 },
    discount_type: {
        type: String, 
        enum: ["percentage", "fixed"],
        required: true,
    },
    discount_value: {
        type: Number,
        required: true,
    },
    start_date: {
        type: Date,
        required: true,
    },
    expire_date: {
        type: Date,
        required: true,
    }
}, { timestamps: true });


const Offer = mongoose.model("Offer", offerSchema);
module.exports = Offer;
