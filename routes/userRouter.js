const express=require('express')
const router=express.Router()
const userController=require('../controllers/user/userController')
const shopController=require('../controllers/user/shopController')
const passport = require('passport')
const auth=require('../middleware/auth')
const profileController=require('../controllers/user/profileController')
const addressController=require('../controllers/user/addressController')
const { uploadProfile,processProfileImage } = require("../helpers/multerHelper");







router.get('/pageNotFound',userController.pageNotFound)
router.get('/signup',auth.userNotIn,userController.loadSignup)
router.post('/signup',userController.signup)
router.post("/verify-otp",auth.userNotIn,userController.verifyOtp)
router.post('/resend-otp',auth.userNotIn,userController.resendOtp)
router.get('/forgot-password', userController.loadForgotPassword);
router.post('/forgot-password', userController.forgotPassword); 
router.post('/resend-passotp',auth.userNotIn,userController.resendPassOtp) 
router.post('/reset-password',userController.resetPassword)

//router.post('/reset-password', resetPassword); 

router.get('/auth/google',auth.userNotIn,passport.authenticate('google',{scope:['profile','email']})  )
router.get('/auth/google/callback',auth.userNotIn,passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})

router.get('/login',auth.userNotIn,userController.loadlogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)


router.get('/',shopController.loadHome)
router.get('/shop',shopController.loadShopage)
router.get('/book/:id',shopController.viewBookDetails)







 


// Route for uploading profile image
router.get('/userProfile',profileController.loadprofile)
router.post("/profile/upload-image", uploadProfile, processProfileImage, profileController.updateProfileImage);
router.delete('/profile/delete-image',profileController.deleteProfileImage)
router.get('/profile/email-change',profileController.loadChangemail)
router.post('/profile/change-email',profileController.changEmail)
router.post('/profile/verify-email',profileController.verifyChangEmail)
router.post('/resend-emailotp',profileController.resendEmailOtp) 
router.post("/profile/update-username",profileController.Changeusername )
router.post("/profile/update-phone",profileController.changephone)


router.get('/profile/address',addressController.loadAddressPage)
router.post('/profile/address',addressController.addNewaddress)
router.get('/profile/address/:id',addressController.loadeditaddress)
router.patch("/profile/address", addressController.editaddress);
router.delete('/profile/address/:id',addressController.deleteAddress)









module.exports=router
