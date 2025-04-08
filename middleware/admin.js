const admin= require('../models/adminSchema')

const adminIn= async(req,res,next)=>{
    try {
        if(req.session.admin){
            next()

        }
        else{
            res.redirect("/admin/login")
            
        }
    } catch (error) {
        console.log(error.message)
        res.redirect('/admin/login');
    }

}
const adminNotIn=async(req,res,next)=>{
    try {
        if(!req.session.user){
            next()
        }
        else{
            res.redirect('/admin/dashboard')
        }
    } catch (error) {

        console.log(error.message)
        res.redirect('/admin/dashboard');
        
    }
}

module.exports={
    adminIn,adminNotIn
}