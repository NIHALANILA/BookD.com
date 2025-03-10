const User=require('../../models/userSchema')
console.log("User Model Loaded:", User);
const {generateOtp,sendVerificationEmail,securePassword}=require('../../helpers/otpHelper')
const bcrypt= require('bcryptjs')







const loadHome=async(req,res)=>{
    try{
        
        let userData=null
        if(req.session.user){
             userData= await User.findOne({username:req.session.user.username})
           
        }
       
        return res.render('home',{user:userData})
    
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
        
        const otp= generateOtp();
        const emailSent = await sendVerificationEmail(email,otp)
        if(!emailSent){
            return res.json("email-error")
        }
       
        

        req.session.userOtp=otp;
        
        
        req.session.userData={username,phone,email,password}
        
        res.render('verify-otp')

        console.log("OTP Sent",otp);
    }
    catch(error){
        console.error(error)

 
    }
}


const verifyOtp = async (req, res) => {
    console.log("Request body:", req.body);
    console.log("Session Data at verifyOtp:", req.session);

    if (req.body.otp === req.session.userOtp) {
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

        
        return res.redirect('/login'); 
    } else {
        console.log("Incorrect OTP entered.");
        return res.status(400).json({ success: false, message: "Incorrect OTP. Please try again!" });
    }
};


const resendotp= async(req,res)=>{
    const newOtp=generateOtp()
    req.session.userOtp=newOtp;
    console.log("new otp",newOtp)
    res.json({success:true,message:"new otp sent"})

}

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
    loadHome,pageNotFound,loadSignup,signup,verifyOtp,resendotp,loadlogin,login,logout
}