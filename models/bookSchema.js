const mongoose=require("mongoose")
const {Schema}=mongoose;


const bookSchema = new Schema({
  category_id: { type: Schema.Types.ObjectId, required: true, ref: "Category" },
  offer_id: { type: Schema.Types.ObjectId, ref: "Offer" },
  title: { type: String, required: true },
  isbn: { type: String, unique: true },
  author: { type: String, required: true },
  publisher: { type: String },
  language: { type: String },
  binding: { type: String, enum: ["paperback", "hardcover"], required: true },
  publishing_date: { type: Date },
  edition: { type: Number },
  number_of_pages: { type: Number },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  book_img: { type: String }
}, { timestamps: true });

Books = mongoose.model("Book", bookSchema);
module.exports=Books;
