const mongoose=require('mongoose')
const {Schema}=mongoose;




const userSchema=new Schema ({
    username:{
        type:String,
        required:true,
        unique:true
         
    },
    email:{
        type:String,
        required:true,
        unique:true

    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null,
          
    },
    password:{
        type:String,
        required:false
    },
    googleId:{
        type:String,
        unique:true,

    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false 
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart"

    }],
    wallet:[{
        type:Schema.Types.ObjectId,
        ref:"Wallet"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order" 
    }],
    createdOn:{
        type:Date,
        default:Date.now
    },
    referalCode:{
        type:String

    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    SearchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        },
        author: {
            type: String  
        },
        publisher: {
            type: String  
        },
        language: {
            type: String  
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }]
    


})
const User=mongoose.model("User",userSchema
)
module.exports=User