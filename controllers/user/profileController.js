
const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const {checkUserSession} = require('../../helpers/userDry')
const path = require("path");
const fs=require('fs')
const {generateOtp,sendVerificationEmail,securePassword}=require('../../helpers/otpHelper');

const bcrypt= require('bcryptjs')


const loadprofile=async(req,res)=>{
    try {
        const { search } = req.query;
        const userData = await checkUserSession(req)
        const user = await User.findById(userData);       
        
        res.render('profile',{user:user||{},searchQuery: search || "",message:null})
    } catch (error) {
        console.log(error)
    }
}


const updateProfileImage = async (req, res) => {
    try {
        if (!req.processedImage) {
            return  res.render('profile',{user:user||{},searchQuery: search || "",message:"please choose a photo"})
        }

        const user = await User.findById(req.session.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        // deleting existing img
        if (user.profileImage ) {
            const oldImagePath = path.join(__dirname,"../public/uploads/profiles", user.profileImage);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // saviing new profile image path
        user.profileImage = req.processedImage;
        await user.save();

        res.redirect('/userProfile');
    } catch (error) {
        console.error("Error updating profile picture:", error);
        res.status(500).json({ message: "Server error" });
    }
};



const deleteProfileImage = async (req, res) => {
    try {
       

        const user = await User.findById(req.session.user._id);
        if (!user) {
            
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        
        //delete img
        if (user.profileImage ) {
            const imagePath = path.join(__dirname, "..", "..", "public", user.profileImage);
           

            if (fs.existsSync(imagePath)) {
                
                fs.unlinkSync(imagePath);
            } else {
                console.log("File not found:", imagePath);
            }
        }

        
        user.profileImage = "";
        await user.save();

        

        
        res.json({ success: true, message: "Profile picture deleted!", profileImage: user.profileImage });

    } catch (error) {
      
        res.status(500).json({ success: false, message: "Server error" });
    }
};


const loadChangemail=async(req,res)=>{
    try {
        res.render('changemail',{message:null})
    } catch (error) {
        console.log(error)
    }
}
const changEmail=async(req,res)=>{
    try {
        const user= await checkUserSession(req)
        if(!user){
            res.redirect('/')

        }

        const newEmail=req.body.newEmail;
        const otp = generateOtp();

          
          req.session.emailOtp = otp;
          req.session.newEmail = newEmail;
          req.session.otpExpires = Date.now() + 60000;

          
        const emailSent = await sendVerificationEmail(
            newEmail,                                     //reused the verification mail function using nodemailer
            otp,
            "Verify Your Email Change",
            "Your OTP for email verification is"
        );

        if (emailSent) {
            res.render('veryfy-mailotp',{message:"verify otp to change email",otpExpires: req.session.otpExpires})
        } else {
            res.send(`<script>alert('Failed to send OTP. Try again later.'); window.location.href='/profile/email-change';</script>`);
        }
        console.log("OTP Sent",otp);

    } catch (error) {
        
        console.error("Request Email Change Error:", error);
        res.status(500).send("Something went wrong.");
    }
}
const verifyChangEmail=async(req,res)=>{

    try {

        const {otp}=req.body;
        const userId= await checkUserSession(req)
        if(!userId){
            res.redirect('/')

        }

        const user= await User.findById(userId);
        if (!user) return res.status(404).send("User not found");

        
         console.log("Received OTP from User:", otp);
         
         if (!req.session.emailOtp || !req.session.newEmail) {
            return res.send(`<script>alert('No OTP request found.'); window.location.href='/profile/email-change';</script>`);
        }

        if (String(req.session.emailOtp) !== String(otp)) {
            return res.render("veryfy-mailotp", { message: "OTP incorrect", otpExpires: req.session.otpExpires });
        }

        
        user.email = req.session.newEmail;
        await user.save();

        
        delete req.session.emailOtp;
        delete req.session.newEmail;
        delete req.session.otpExpires;


        res.send(`<script>alert('Email updated successfully!'); window.location.href='/userProfile';</script>`);

    
        
    } catch (error) {

        console.error("Email Verification Error:", error);
        res.status(500).send("Something went wrong.");
        
    }


}

const resendEmailOtp= async(req,res)=>{
    const newOtp=generateOtp()
   req.session.emailOtp=newOtp;    
    req.session.otpExpires = Date.now() + 60000;
    console.log("new otp",newOtp)
    res.json({success:true,message:"new otp sent"})

}

const Changeusername=async(req,res)=>{
    try {
        const user = await checkUserSession(req);
        if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { username } = req.body;
        if (!username) return res.status(400).json({ success: false, message: "Username is required" });

        
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Username already taken" });
        }

        
        await User.findByIdAndUpdate(user, { username });
        req.session.user.username = username;

       return res.json({ success: true, message: "Username updated successfully" });
       


       
      
    } catch (error) {
        console.error("Error updating username:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

const changephone=async(req,res)=>{
    try {
        const userId = await checkUserSession(req);
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
        const{phone}=req.body
        if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "this phone already used" });
        }

        await User.findByIdAndUpdate(userId, { phone });
        return res.json({ success: true, message: "Username updated successfully" });
    } catch (error) {

        console.error("Error updating phone:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
        
    }
}

const passwordChange=async(req,res)=>{
    try {
        const userId=await checkUserSession(req);
        if(!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        res.render('changepass',{message:null})
    } catch (error) {
        console.log(error)
        
    }
}

const confirmPassword=async(req,res)=>{
    try {
        const user= await checkUserSession(req);
        if(!user) return res.status(401).json({success:false,message:'Unauthorised'})
        
            const {password,Npassword,cnpassword}=req.body;

            const match= await bcrypt.compare(password,user.password)
            if(!match) return res.status(400).json({success:false,message:'Incorrect password'})

            if(Npassword!==cnpassword) return res.status(400).json({success:false,message:"new password does not math"})

            const hashed=await bcrypt.hash(Npassword,10)
            await User.findByIdAndUpdate(user._id,{password:hashed})

            res.json({success:true,message:'password changed succefully'})
    } catch (error) {

        console.error(error)
        res.status(500).json({success:false,message:'server error'})
        
    }
}


module.exports={loadprofile,updateProfileImage,deleteProfileImage,loadChangemail,changEmail,verifyChangEmail,resendEmailOtp,Changeusername,changephone,passwordChange,confirmPassword}