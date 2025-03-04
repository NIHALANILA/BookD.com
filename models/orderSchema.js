const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid'); 

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(), 
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    paymentId: {
        type: Schema.Types.ObjectId,
        ref: 'Payment',
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
        enum: ["processing", "delivered", "cancelled"],
        default: "processing"
    },
    shippingCharge: {
        type: Number,
        default: 0
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
