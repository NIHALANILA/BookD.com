const User=require('../../models/userSchema')
const {generateOtp,sendVerificationEmail,securePassword}=require('../../helpers/otpHelper')
const bcrypt= require('bcryptjs')
const Category=require('../../models/categorySchema')
const Books=require('../../models/bookSchema')
const Coupon=require('../../models/couponSchema')


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
        console.error('error in signup',error)
        res.redirect('/pageNotfound')
    }
}

 
    

const signup=async(req,res)=>{
    
    try{
        const {username,phone,email,password,cpassword,referral}=req.body
        if(password!==cpassword){
            return res.render("signup",{message:"password do not  match"})
        }
        const findUser= await User.findOne({email});
        if(findUser){
            return res.render("signup",{message:"user with this email already exist"})
        }

        const findName= await User.findOne({username})
        if(findName){
            return res.render('signup',{message:"user with this username already exist"})
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
        
         
        req.session.userData={username,phone,email,password,referral}
        
        res.render('verify-otp',{message:null ,otpExpires: req.session.otpExpires})

       
    }
    catch(error){
        console.error(error)
        res.redirect('/pageNotFound');

 
    }
}


const verifyOtp = async (req, res) => {
    
    try{

        
        const {otp}=req.body
        
        if (otp === req.session.userOtp) {
            
            
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);
            
            //  referal code of new user
            const generateReferralCode = () => {
                return Math.random().toString(36).substring(2, 8).toUpperCase(); 
            };
            
            const saveUserData = new User({
            username: user.username,
            email: user.email,
            phone: user.phone,
            password: passwordHash,
            referalCode: generateReferralCode(),  
            redeemed: false
        });

        await saveUserData.save();
        
        
        if (user.referral) {
            const referrer = await User.findOne({ referalCode: user.referral });
            if (referrer && !referrer.redeemedUsers.includes(saveUserData._id)) {
                referrer.redeemedUsers.push(saveUserData._id);
                referrer.redeemed = true;
                await referrer.save();
                
                
                const referralCoupon = new Coupon({
                    code: "REF" + Math.random().toString(36).substring(2, 6).toUpperCase(),
                    discountValue: 100, 
                    discountType: "fixed",
                    limit: 1,
                    usedCount: 0,
                    minimumPrice: 700,
                    limitPerUser: true,
                    expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
                    isActive: "yes",
                    issuedTo: referrer._id
                });

                await referralCoupon.save();
                
            }
        }
        
        req.session.user = {
            _id: saveUserData._id,
            username: saveUserData.username
        };
        
        
        
        delete req.session.userOtp;
        delete req.session.userData;
        delete req.session.otpExpires;
        
        
        return res.redirect('/'); 
    } 

    //forget password
    else if (otp === req.session.resetOtp) {
        
        delete req.session.resetOtp;
        delete req.session.otpExpires;
        
        return res.render("reset-password", { email: req.session.resetEmail, message: "" });
    } 
    
    else {
        
        return res.render("verify-otp", { message: "OTP incorrect", otpExpires: req.session.otpExpires });
    }
    
    
    
}
catch(error){
    res.redirect('/pageNotFound');
    return res.json({message:'something went wrong'})
}

}

const resendOtp= async(req,res)=>{
    try {
         const newOtp=generateOtp()
    req.session.userOtp=newOtp;    
    req.session.otpExpires = Date.now() + 60000;
    res.json({success:true,message:"new otp sent"})
    } catch (error) {
        res.status(500).json({message:'something went wrong'})
        
    }
   

}
const resendPassOtp= async(req,res)=>{
    try {

        const newOtp=generateOtp()
   req.session.resetOtp=newOtp;    
    req.session.otpExpires = Date.now() + 60000;
    res.json({success:true,message:"new otp sent"})
        
    } catch (error) {
        res.status(500).json({message:'something went wrong'})
    }
    

}




const loadForgotPassword=async(req,res)=>{
    try {
        res.render('forgot-password',{message:null})
    } catch (error) {
        console.error(error)
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
     
     if(!findUser){
        return res.render("login",{message:"user not found"})
     }
     if(findUser.status==='blocked'){
        return res.render("login",{message:"user is blocked"})
     }
     if(findUser.googleId){
        return res.render("login",{message:"please do google login"})
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
        return res.status(500).json({message:'something went wrong'})
    }
}


const logout= async(req,res)=>{
    try{
        req.logout(function (err) {
            if (err) {
              
              return res.redirect("/pageNotFound");
            }
      
        
            req.session.user = null;
      
            res.redirect("/login");
          });
    }
    catch(error){
        console.error('error in logout user',error)
        res.redirect("/pageNotFound")

    }
}

const resetPassword=async(req,res)=>{
    try {
        const{password,cpassword}=req.body;
       const email= req.session.resetEmail

        if (!email) {
            return res.redirect("/forgot-password");
        }

        if (password !== cpassword) {
            return res.render("reset-password", { email, message: "Passwords do not match" });
        }

        const passwordHash = await securePassword(password);

        await User.updateOne({ email }, { $set: { password: passwordHash } });

        delete req.session.resetEmail;
        res.redirect("/login");

    } catch (error) {
        console.error('error in resetpassword',error);
        res.redirect("/pageNotfound");
    }
}


module.exports={
    pageNotFound,loadSignup,signup,verifyOtp,resendOtp,loadlogin,login,logout,loadForgotPassword,forgotPassword,resendPassOtp,resetPassword
    
}