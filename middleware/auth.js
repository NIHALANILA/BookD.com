const User=require('../models/userSchema')

const userIn=async(req,res,next)=>{
    try {
        if(req.session.user){
            next()
        }
        else{
            res.redirect('/login')
        }
    } catch (error) {

        console.log(error)
        
    }

}

const userNotIn=async(req,res,next)=>{
    try {
        if(!req.session.user){
            next()
        }
        else{
            res.redirect('/')
        }
    } catch (error) {
        console.log(error)
        
    }
}


const userValid= async(req,res,next)=>{

    try {

        const user= await User.findOne({username:req.session.user})

        if(user?.isBlocked){

            delete req.session.user;
            return res.redirect("/")

        }

        next()
        
    } catch (error) {
        console.log(error.message)
        r
    }


}



module.exports={userIn,userNotIn,userValid}