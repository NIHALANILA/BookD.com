const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [
      {
        bookId: {
          type: Schema.Types.ObjectId,
          ref: "Book",
          required: true
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1
        },
        price: {
          type: Number,
          required: true
        },
        totalPrice: { type: Number }
        
      }
    ],
    status: {
      type: String,
      enum: ["active", "checked_out"],
      default: "active"
    }
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
