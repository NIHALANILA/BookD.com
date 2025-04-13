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
        required: true,
        min: 1
    },
    usedCount: {
        type: Number,
        default: 0
    },
    minimumPrice: {
        type: Number,
        default: 0
    },
    expireDate: {
        type: Date,
        required: true
    },
    usersUsed: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
        default: []
      },

    isDeleted: {
        type: Boolean,
        default: false
      }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
 