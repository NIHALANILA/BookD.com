const passport= require("passport");
const GoogleStrategy=require("passport-google-oauth20").Strategy;
const User=require("../models/userSchema");
const env=require('dotenv').config()



passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"/auth/google/callback"
},


async(accessToken,refreshToken,profile,done)=>{
    try{

      console.log("✅ Google OAuth Callback Triggered");
        console.log("🔹 Google Profile:", profile);
      let user=await User.findOne({googleId:profile.id})
      if(user){
        return done(null,user)
        console.log("✅ User already exists:", user);
      }
       existingUser=await User.findOne({email:profile.emails[0].value})
      if(existingUser){

        console.log("🔄 Updating existing user with Google ID");
        existingUser.googleId=profile.id;
        await existingUser.save()
        console.log("✅ New User Created:", user);
        return done(null,existingUser)

      }
      
        user=new User({
            username:profile.displayName,
            email:profile.emails[0].value,
            googleId:profile.id

        })
        await user.save()
        return done(null,user)
      }
    
    catch(err){
        return done(err,null)

    }
    
}))

passport.serializeUser((user,done)=>{
    done(null,user.id)
})

passport.deserializeUser((id,done)=>{
  User.findById(id)
  .then(user=>{
    done(null,user)
  })
  .catch(err=>{
    done(err,null)
  })
})

module.exports =passport