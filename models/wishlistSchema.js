const mongoose = require("mongoose");
const { Schema } = mongoose;

const wishlistSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  book_id: { type: Schema.Types.ObjectId, ref: "Book", required: true },
  added_on: { type: Date, default: Date.now }
}, { timestamps: true });



const Wishlist=mongoose.model("Wishlist", wishlistSchema);
module.exports = Wishlist;
