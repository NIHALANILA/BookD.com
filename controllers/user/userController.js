const User=require('../../models/userSchema')
console.log("User Model Loaded:", User);
const {generateOtp,sendVerificationEmail,securePassword}=require('../../helpers/otpHelper')
const bcrypt= require('bcryptjs')
const Category=require('../../models/categorySchema')
const Books=require('../../models/bookSchema')






const loadHome=async(req,res)=>{
    try{
        
        let userData=null
        if(req.session.user){
             userData= await User.findOne({username:req.session.user.username})
           
        }
        
        const { search } = req.query;
        
        const newArrivals= await Books.find({isDeleted:false,isListed:true}).sort({_id:1})
        const bestSellers=await Books.find({isDeleted:false,isListed:true}).sort({edition:-1})
        
        
        return res.render('home',{user:userData,newArrivals,bestSellers, searchQuery: search || "" })
    
    }
    catch(error){
        console.log(error)

    }
}
const pageNotFound=async(req,res)=>{
    try{
    res.render('page404')
    }
    catch(error){
        res.redirect('/pageNotfound')
        

    }
}
const loadSignup=async(req,res)=>{
    try{
        res.render('signup',{message:null})

    }
    catch(error){
        console.log(error)
    }
}

 
    

const signup=async(req,res)=>{
    
    try{
        const {username,phone,email,password,cpassword}=req.body
        if(password!==cpassword){
            return res.render("signup",{message:"password do not  match"})
        }
        const findUser= await User.findOne({email});
        if(findUser){
            return res.render("signup",{message:"User with this email already exist"})
        }
        const subject = "Verify Your Account";
        const message = "Your OTP for account verification is";
        const otp= generateOtp();
        const emailSent = await sendVerificationEmail(email,otp,subject,message)
        if(!emailSent){
            return res.json("email-error")
        }
       
        

        req.session.userOtp=otp;
        
        req.session.otpExpires = Date.now() + 60000;
        
         
        req.session.userData={username,phone,email,password}
        
        res.render('verify-otp',{message:null ,otpExpires: req.session.otpExpires})

        console.log("OTP Sent",otp);
    }
    catch(error){
        console.error(error)

 
    }
}


const verifyOtp = async (req, res) => {
    console.log("Request body:", req.body);
    console.log("Session Data at verifyOtp:", req.session);
      
      const {otp}=req.body
   
    if (otp === req.session.userOtp) {
        console.log("OTP Matched! Saving user...");

        const user = req.session.userData;
        const passwordHash = await securePassword(user.password);

        const saveUserData = new User({
            username: user.username,
            email: user.email,
            phone: user.phone,
            password: passwordHash
        });

        await saveUserData.save();
        console.log("User successfully saved in the database!");

        
        
        delete req.session.userOtp;
        delete req.session.userData;
        delete req.session.otpExpires;

        
        return res.redirect('/login'); 
    } 

    //forget password
    else if (otp === req.session.resetOtp) {
        console.log("OTP Matched for Reset Password! Redirecting to reset page...");

        
        delete req.session.resetOtp;
        delete req.session.otpExpires;

        return res.render("reset-password", { email: req.session.resetEmail, message: "" });
    } 
    
    else {
        console.log("Incorrect OTP entered.");
        return res.render("verify-otp", { message: "OTP incorrect", otpExpires: req.session.otpExpires });
    }
    


};


const resendOtp= async(req,res)=>{
    const newOtp=generateOtp()
    req.session.userOtp=newOtp;    
    req.session.otpExpires = Date.now() + 60000;
    console.log("new otp",newOtp)
    res.json({success:true,message:"new otp sent"})

}
const resendPassOtp= async(req,res)=>{
    const newOtp=generateOtp()
   req.session.resetOtp=newOtp;    
    req.session.otpExpires = Date.now() + 60000;
    console.log("new otp",newOtp)
    res.json({success:true,message:"new otp sent"})

}




const loadForgotPassword=async(req,res)=>{
    try {
        res.render('forgot-password',{message:null})
    } catch (error) {
        console.log(error)
        res.redirect('/pageNotfound')
        
    }
}
const forgotPassword=async(req,res)=>{
    try {
        const {email}=req.body;
        const user= await User.findOne({email})
        if(!user){
            return res.render('forgot-password',{message:"user not found"})
        }
        const otp=generateOtp()
        const subject = "Reset Your Password";
        const message = "Your OTP for password reset is";
        const emailSent=await sendVerificationEmail(email,otp,subject,message)
        if(!emailSent){
            return res.render("forgot-password",{message:"error happened in sending otp to given mail"})
        }
        req.session.resetOtp=otp;
        req.session.otpExpires=Date.now()+60000;
        req.session.resetEmail=email;
        res.render('veryfy-passotp',{message:"verify otp to reset password",otpExpires: req.session.otpExpires})
        console.log("reset otp sent:",otp)
    } catch (error) {
        console.error(error)
        res.redirect("/forgot-password")
    }}


const loadlogin=async(req,res)=>{
    try{
        if(!req.session.user){
            res.render('login',{message:""})
        }
        else{
            res.redirect('/')
        }

    }
    catch(error){
        res.redirect('/pageNotfound')

    }
}


const login=async(req,res)=>{
    try{
     const {username,password}=req.body;
    
     const findUser= await User.findOne({username:username})
     console.log(findUser)
     if(!findUser){
        return res.render("login",{message:"user not found"})
     }
     if(findUser.isBlocked){
        return res.render("login",{message:"user is blocked"})
     }

     const passwordMatch= await bcrypt.compare(password,findUser.password)
     if(!passwordMatch){
        return res.render("login",{message:"incorrect password"})

     }
     
     req.session.user = {
        _id: findUser._id,
        username: findUser.username 
    };
    
     res.redirect('/')
    }
    catch(error){

        console.error(error)
    }
}


const logout= async(req,res)=>{
    try{
       req.session.destroy((error)=>{
        if(error){
            console.log("error.message")
            return redirect('/pageNotFound')
        }
        return res.redirect("/login")
       })
    }
    catch(error){
        console.log(error)
        res.redirect("/pageNotFound")

    }
}



module.exports={
    loadHome,pageNotFound,loadSignup,signup,verifyOtp,resendOtp,loadlogin,login,logout,loadForgotPassword,forgotPassword,resendPassOtp
    
}