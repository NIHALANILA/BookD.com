const mongoose=require('mongoose')
const {Schema}=mongoose;




const userSchema=new Schema ({
    username:{
        type:String,
        required:function (){
            return ! this.googleId
        },
        unique:false
         
    },
    email:{
        type:String,
        required:true,
        unique:true

    },
    phone:{
        type:String,
        required:false,
        unique:true,
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
    status: { 
        type: String,
        enum: ["active", "blocked"], 
        default: "active"
    },
    profileImage: {
        type: String,  
        default: ""    
    },
    
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
    selectedAddress: {
        type: Schema.Types.ObjectId,
        ref: "Address",
        default: null  
    }
    


},{ timestamps: true })
const User=mongoose.model("User",userSchema
)
module.exports=User