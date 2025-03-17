const mongoose=require('mongoose')
const {Schema}=mongoose;



const categorySchema=new Schema({
   name: {
      type: String,
      required: true,
      unique: true
  },
  isListed: {
      type: Boolean,
      default: true
  },
  createdAt: {
      type: Date,
      default: Date.now
  },
  isDeleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null } 
})
const Category=mongoose.model("Category",categorySchema);
module.exports=Category
 