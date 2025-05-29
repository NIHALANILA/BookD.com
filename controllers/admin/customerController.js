const User= require('../../models/userSchema')
const Contact=require('../../models/contactSchema');



const customerlist= async(req,res)=>{
    try {
        let search= req.query?.search||"";
        let page=parseInt(req.query.page)||1;
        const limit=5

        const query = search ?{
            $or:[{username:{$regex:search,$options:"i"}},         //avoid regex search whn serach is empty
                { email: { $regex: search, $options: "i" } }
            ]

        }:{}

        const users= await User.find(query).sort({createdAt:-1})
        .limit(limit)
        .skip((page-1)*limit)
        .exec()

      const count=await User.countDocuments(query);
      const totalPages = Math.ceil(count / limit);

      let message = "";
        if (users.length === 0) {
            message = `No results found for "${search}".`;
        }
      res.render('customermanage',{
            users,
            search,
            currentPage: page,
            totalPages,
            message
            
      })
    
    } catch (error) {
       console.error(error.message);
       res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
       
    }
}

const blockCustomer=async(req,res)=>{
    try {
        await User.findByIdAndUpdate(req.params.id,{status:"blocked"})
        res.json({ success: true, message: "User blocked successfully" });
    } catch (error) {
        console.error(error.message);
         res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
    }
}
const unBlockCustomer=async(req,res)=>{
    try {
        await User.findByIdAndUpdate(req.params.id,{status:"active"})
        res.json({ success: true, message: "User unblocked successfully" });
    } catch (error) {
        console.log(error)
         res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
    }
}


const messageHandle=async(req,res)=>{
    try {
        
        let search=req.query?.search||"";
        let page=parseInt(req.query.page)||1;
        const limit=5;
        const query=search?{
            $or:[{username:{$regex:search,$options:"i"}}]
        }:{}
        const contactMsg=await Contact.find(query).sort({createdAt:-1})
                    .limit(limit)
                    .skip((page-1)*limit)
                    .exec()

        const count=await Contact.countDocuments(query)
        const totalPages=Math.ceil(count/limit)   
        let message="" ;
        if(contactMsg.length===0){
            message="No messages"
        } 
        res.render('messages',{contactMsg,search,currentPage:page,totalPages,message})      
    } catch (error) {
        res.status(500).send({error:'internal server error'})
    }
}

const resolveMsg=async(req,res)=>{
    try {
        
        await Contact.findByIdAndDelete(req.params.id)
        res.json({success:true,message:'updated issue as  resolved'})
    } catch (error) {
        res.status(500).send({error:'Internal server error'})
    }
}



module.exports={customerlist,blockCustomer,unBlockCustomer,messageHandle,resolveMsg }