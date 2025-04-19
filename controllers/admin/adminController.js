const Admin=require('../../models/adminSchema')
const bcrypt=require('bcryptjs')



const loadlogin=(req,res)=>{
    try{
        if(req.session.admin){
        
            return res.redirect('/dashboard')

        }
        return res.render('admin-login',{message:""})
    }
    catch(error){
       console.log(error)

    }
}
const login=async(req,res)=>{

try {

    const {username,password}=req.body

    const admin=await Admin.findOne({username:username});
    if(!admin) return res.render('admin-login', {message: 'Invalid credentials'})

    const isMatch = await bcrypt.compare(password, admin.password)
    if(!isMatch) return res.render('admin-login', {message: 'Invalid credentials'})
   
    req.session.admin = true

    return res.redirect('/admin/dashboard')

    


} 

    
 catch (error) {
    console.log(error)
    return res.redirect('/pageNotFounnd')
}}


const dashboard=async(req,res)=>{

    try {
     if(req.session.admin)
        res.render('dashboard')
    else{
        res.redirect('/admin/login')
    }

    } catch (error) {
        console.error(error)
    }
}
const logout=async(req,res)=>{
    try {
        req.session.admin = null;
        res.redirect('/admin/login');
    } catch (error) {
        console.log(error)
        
    }
}
module.exports={loadlogin,login,dashboard,logout}