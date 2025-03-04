const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new Schema({
    isActive: {
        type: String,
        enum: ["yes", "no"],
        default: "yes"
    },
    code: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    couponType: {
        type: String,
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true
    },
    limit: {
        type: Number,
        default: 1 // Limits the number of times a coupon can be used
    },
    minimumPrice: {
        type: Number,
        default: 0 // Minimum order price required to apply the coupon
    },
    expireDate: {
        type: Date,
        required: true
    }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
