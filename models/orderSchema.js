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
        enum: ["initiated","processing", "delivered", "cancelled","shipped","returned","orderRequested","itemRequested","Payment Failed","Partial return","rejected"],
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
    cancelledItems:{
        type:Number,
        default:0

    },
    returnedItems:{
        type:Number,
        default:0
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {                      //sum of totalPrice of all books
        type: Number,
        required: true
    },
    netAmount: {                //total payed amount by customer (tax,discount,shippingcharge (included))
        type: Number,
        required: true
    },
    discount: {
        type: Number,         //reduced price by applying coupon on order
        default: 0
    },
    couponApplied:{
        type:Number,
        default:0
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
        discount: {             //price reduced by applying offer
            type: Number,
            default: 0
        },
        totalPrice: {            //price of  a book a fter applied an offer 
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['Ordered', 'Cancelled', 'Returned',"Requested","Delivered","Rejected"],
            default: 'Ordered'
          },
          cancelReason: { type: String, default: "" },
          returnReason: { type: String, default: "" }
    }]
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
