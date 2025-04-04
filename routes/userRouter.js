const express=require('express')
const router=express.Router()
const userController=require('../controllers/user/userController')
const shopController=require('../controllers/user/shopController')
const passport = require('passport')
const auth=require('../middleware/auth')
const profileController=require('../controllers/user/profileController')
const addressController=require('../controllers/user/addressController')
const { uploadProfile,processProfileImage } = require("../helpers/multerHelper");
const cartController=require('../controllers/user/cartController')
const orderController=require('../controllers/user/orderController')







router.get('/pageNotFound',userController.pageNotFound)
router.get('/signup',auth.userNotIn,userController.loadSignup)
router.post('/signup',userController.signup)
router.post("/verify-otp",auth.userNotIn,userController.verifyOtp)
router.post('/resend-otp',auth.userNotIn,userController.resendOtp)
router.get('/forgot-password', userController.loadForgotPassword);
router.post('/forgot-password', userController.forgotPassword); 
router.post('/resend-passotp',auth.userNotIn,userController.resendPassOtp) 
router.post('/reset-password',userController.resetPassword)

 

router.get('/auth/google',auth.userNotIn,passport.authenticate('google',{scope:['profile','email']})  )
router.get('/auth/google/callback',auth.userNotIn,passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    req.session.user = {
        _id: req.user._id,
        username: req.user.username
      };
  
     
    res.redirect('/')
})

router.get('/login',auth.userNotIn,userController.loadlogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)


router.get('/',auth.loadCommonData,shopController.loadHome)
router.get('/shop',auth.loadCommonData,shopController.loadShopage)
router.get('/book/:id',auth.loadCommonData,shopController.viewBookDetails)







 


// Route for uploading profile image
router.get('/userProfile',auth.loadCommonData,profileController.loadprofile)
router.post("/profile/upload-image", uploadProfile, processProfileImage, profileController.updateProfileImage);
router.delete('/profile/delete-image',profileController.deleteProfileImage)
router.get('/profile/email-change',profileController.loadChangemail)
router.post('/profile/change-email',profileController.changEmail)
router.post('/profile/verify-email',profileController.verifyChangEmail)
router.post('/resend-emailotp',profileController.resendEmailOtp) 
router.post("/profile/update-username",profileController.Changeusername )
router.post("/profile/update-phone",profileController.changephone)

//address
router.get('/profile/address',auth.loadCommonData,addressController.loadAddressPage)
router.post('/profile/address',addressController.addNewaddress)
router.get('/profile/address/:id',auth.loadCommonData,addressController.loadeditaddress)
router.patch("/profile/address", addressController.editaddress);
router.delete('/profile/address/:id',addressController.deleteAddress)


//cart
router.post('/cart',cartController.addcart)
router.get('/cart',auth.loadCommonData,cartController.viewCart)
router.post('/cart/update',cartController.updateCart)
//
 router.post('/cart/remove',cartController.removecart)
 


 router.post('/profile/address/select')

 router.post('/checkout',auth.loadCommonData,orderController.loadcheckout)
 router.post('/buynow',auth.loadCommonData,orderController.buynow)
 router.post('/place-order',orderController.placeOrder)
 router.get('/orders/success/:orderId',auth.loadCommonData,orderController.orderSuccess,auth.success)

router.get('/orders',auth.loadCommonData,orderController.orderList)
router.post('/orders/cancel/:id',orderController.orderCancel)
router.get('/orders/view/:orderId',auth.loadCommonData,orderController.orderSuccess,auth.view)









module.exports=router
