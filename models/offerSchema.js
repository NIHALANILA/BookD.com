const mongoose = require('mongoose');
const { Schema } = mongoose;

const offerSchema = new Schema({

    name: {
        type: String,
        required: true,
        trim: true,
    },
    applyTo: {
        type: String,
        enum: ["book", "category"],
        required: true
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
    
    discount_type: {
        type: String, 
        enum: ["percentage"],
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
    status: { 
        type: String,
        enum: ["active", "blocked"], 
        default: "active"
    },
    expire_date: {
        type: Date,
        required: true,
    },
}, { timestamps: true });

offerSchema.pre('save', function (next) {
    if (this.applyTo === 'product' && (!this.book_ids || this.book_ids.length === 0)) {
        return next(new Error("Offer is applied to products, but no book_ids provided."));
    }
    if (this.applyTo === 'category' && !this.category_id) {
        return next(new Error("Offer is applied to a category, but no category_id provided."));
    }
    if (this.book_ids && this.book_ids.length > 0 && this.category_id) {
        return next(new Error("Offer cannot be applied to both category and individual books."));
    }
    next();
});


const Offer = mongoose.model("Offer", offerSchema);
module.exports = Offer;
