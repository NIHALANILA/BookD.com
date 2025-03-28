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






module.exports={userIn,userNotIn}