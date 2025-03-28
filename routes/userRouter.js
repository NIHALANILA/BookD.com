const express=require('express')
const router=express.Router()
const userController=require('../controllers/user/userController')
const shopController=require('../controllers/user/shopController')
const passport = require('passport')
const auth=require('../middleware/auth')







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











module.exports=router
