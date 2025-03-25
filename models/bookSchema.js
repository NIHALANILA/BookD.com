const mongoose=require("mongoose")
const {Schema}=mongoose;


const bookSchema = new Schema({
  category_ids: [{ type: Schema.Types.ObjectId, required: true, ref: "Category" }],
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
  book_images: [{ type: String, required: true }], 
  isDeleted: { type: Boolean, default: false },   
  isListed: { type: Boolean, default: true },
       
}, { timestamps: true });



Books = mongoose.model("Book", bookSchema);
module.exports=Books;
