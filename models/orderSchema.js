const mongoose = require('mongoose');
const { Schema } = mongoose;


const orderSchema = new Schema({
    orderId: {
        type: String,
        unique: true,
        required: true,
        default: function () {
            return `BKD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    }},
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'online', 'wallet'],
        required: true
    },
    couponId: {
        type: Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null
    },
    addressId: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    deliveryDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ["initiated","processing", "delivered", "cancelled","shipped","returned","requested","Payment Failed"],
        default: "initiated"
    },
    shippingCharge: {
        type: Number,
        default: 0
    },

    cancelReason: {
        type: String,
        default: null
    },
    returnReason: {
        type: String,
        default: null
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    netAmount: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    orderItems: [{
        bookId: {
            type: Schema.Types.ObjectId,
            ref: 'Book',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        offerId: {
            type: Schema.Types.ObjectId,
            ref: 'Offer',
            default: null
        },
        discount: {
            type: Number,
            default: 0
        },
        totalPrice: {
            type: Number,
            required: true
        }
    }]
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
