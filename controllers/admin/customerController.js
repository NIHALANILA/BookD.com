const User= require('../../models/userSchema')

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
        console.log(error)
    }
}

const blockCustomer=async(req,res)=>{
    try {
        await User.findByIdAndUpdate(req.params.id,{status:"blocked"})
        res.json({ success: true, message: "User blocked successfully" });
    } catch (error) {
        console.log(error)
    }
}
const unBlockCustomer=async(req,res)=>{
    try {
        await User.findByIdAndUpdate(req.params.id,{status:"active"})
        res.json({ success: true, message: "User unblocked successfully" });
    } catch (error) {
        console.log(error)
    }
}




module.exports={customerlist,blockCustomer,unBlockCustomer}