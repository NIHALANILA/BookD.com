const mongoose = require('mongoose');
const { Schema } = mongoose;

const offerSchema = new Schema({
    book_id: {
        type: Schema.Types.ObjectId,
        ref: "Book",
        required: true
    },
    category_id: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true
    },
    discount_value: {
        type: Number,
        required: true
    },
    start_date: {
        type: Date,
        required: true
    },
    expire_date: {
        type: Date,
        required: true
    }
}, { timestamps: true });

const Offer = mongoose.model("Offer", offerSchema);
module.exports = Offer;
