const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
    book_id: {
        type: Schema.Types.ObjectId,
        ref: "Book",
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    }
}, { timestamps: true });

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
