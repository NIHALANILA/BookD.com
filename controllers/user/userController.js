const User=require('../../models/userSchema')
const {generateOtp,sendVerificationEmail}=require('../../helpers/otpHelper')






const loadHome=async(req,res)=>{
    try{
       res.render('home')
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
        const {email,password,cpassword}=req.body
        if(password!==cpassword){
            return res.render("signup",{message:"password do not  match"})
        }
        const findUser= await User.findOne({email});
        if(findUser){
            return res.render("signup",{message:"User with this email already exist"})
        }
        const otp= generateOtp();
        const emailSent = await sendVerificationEmail(email,otp)
        if(emailSent){
            res.render('signup',{message:'otp sent succefully '})
        }
        else{
            return res.json('email-error')
        }

        req.session.userOtp=otp;
        req.session.userData={email,password}

        console.log("OTP Sent",otp);
    }
    catch(error){
        console.error(error)

    }
}

module.exports={
    loadHome,pageNotFound,loadSignup,signup
}