const Admin=require('../../models/adminSchema')
const bcrypt=require('bcryptjs')
const Order=require('../../models/orderSchema');
const moment = require('moment'); 
const {dashBoard}=require('../../helpers/dashBoardHelper')


const loadlogin=(req,res)=>{
    try{
        if(req.session.admin){
        
            return res.redirect('/dashboard')

        }
        return res.render('admin-login',{message:""})
    }
    catch(error){
        return res.redirect('/pageNotFound')
        
       console.error( error.message);

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
    console.error( error.message);
    return res.redirect('/pageNotFound')
}}


const loaddashboard=async(req,res)=>{

    try {
     if(req.session.admin){
        const { filterType, fromDate, toDate } = req.query;
        const { result, dateRange } = await dashBoard({ filterType, fromDate, toDate })

        res.render('dashboard', {
            from: dateRange?.$gte || null,
            to: dateRange?.$lte || null,
            filterType: filterType ,
            result,
            moment
          });
     }
        
    else{
        res.redirect('/admin/login')
    }

    } catch (error) {
        return res.redirect('/pageNotFound')
        console.error( error.message);
    }
}
const logout=async(req,res)=>{
    try {
        req.session.admin = null;
        res.redirect('/admin/login');
    } catch (error) {
        return res.redirect('/pageNotFound')
        console.error(error.message);
        
    }
}
module.exports={loadlogin,login,loaddashboard,logout}