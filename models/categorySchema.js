const mongoose=require('mongoose')
const {Schema}=mongoose;



const categorySchema=new mongoose.Schema({
     isListed:{
        type:Boolean,
        default:true
     },
     categoryOffer:{
        type:Number,
        default:0
     },
     createdAt: {
        type:Date,
        default:Date.now()
     }
})
const Category=mongoose.model("Category",categorySchema);
module.exports=Category
 