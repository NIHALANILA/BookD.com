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
const walletController=require('../controllers/user/walletController')
const razorpay = require('../helpers/razorpay');
const crypto = require('crypto');







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
router.get('/contact',auth.loadCommonData,shopController.contact)
router.post('/contact',auth.loadCommonData,shopController.contactmsg)
router.get('/book/:id',auth.loadCommonData,shopController.viewBookDetails)
router.get('/returnCancel',auth.loadCommonData,shopController.returnCancelPolicy)








 


// Route for uploading profile image
router.get('/userProfile',auth.userIn,auth.loadCommonData,profileController.loadprofile)
router.post("/profile/upload-image",auth.userIn, uploadProfile, processProfileImage, profileController.updateProfileImage);
router.delete('/profile/delete-image',auth.userIn,profileController.deleteProfileImage)
router.get('/profile/email-change',auth.userIn,profileController.loadChangemail)
router.post('/profile/change-email',auth.userIn,profileController.changEmail)
router.post('/profile/verify-email',auth.userIn,profileController.verifyChangEmail)
router.post('/resend-emailotp',auth.userIn,profileController.resendEmailOtp) 
router.post("/profile/update-username",auth.userIn,profileController.Changeusername )
router.post("/profile/update-phone",auth.userIn,profileController.changephone)
router.get('/profile/change/password',auth.userIn,profileController.passwordChange)
router.patch('/profile/change/password',auth.userIn,profileController.confirmPassword)

//address
router.get('/profile/address',auth.userIn,auth.userIn,auth.loadCommonData,addressController.loadAddressPage)
router.post('/profile/address',auth.userIn,addressController.addNewaddress)
router.get('/profile/address/:id',auth.userIn,auth.loadCommonData,addressController.loadeditaddress)
router.patch("/profile/address/:id",auth.userIn, addressController.editaddress);
router.delete('/profile/address/:id',auth.userIn,addressController.deleteAddress)


//cartController-cart and wishlist
router.post('/cart',cartController.addcart)
router.get('/cart',auth.userIn,auth.loadCommonData,cartController.viewCart)
router.patch('/cart',auth.userIn,cartController.updateCart)
//
 router.delete('/cart',auth.userIn,cartController.removecart)
 
 router.get('/wishlist',auth.userIn,auth.loadCommonData,cartController.loadWishlist)
 router.post('/wishlist',auth.loadCommonData,cartController.addWishlist)
 router.delete('/wishlist/:id',auth.userIn,cartController.deleteWishlist)

 //orderController
 router.get('/checkout',auth.userIn,auth.loadCommonData,orderController.loadcheckout)
 router.post('/checkout',auth.userIn,auth.loadCommonData,orderController.loadcheckout)
 router.post('/buynow',auth.userIn,auth.loadCommonData,orderController.buynow)
 router.post('/place-order',auth.userIn,orderController.placeOrder)
 router.get('/orders/success/:orderId',auth.userIn,auth.loadCommonData,orderController.orderSuccess,auth.success)

router.get('/orders',auth.loadCommonData,orderController.orderList)
router.patch('/orders/cancel/:id',auth.userIn,orderController.orderCancel)
router.patch('/orders/cancel-item/:id',auth.userIn,orderController.cancelItem)
router.get('/orders/view/:orderId',auth.userIn,auth.loadCommonData,orderController.orderSuccess,auth.view)
router.patch('/orders/return/:id',auth.userIn,orderController.returnOrder)
router.patch('/orders/return-item/:id',auth.userIn,orderController.returnItem)
router.get('/orders/invoice/:id',auth.userIn, orderController.downloadInvoice);

//coupon related
router.post('/apply-coupon',auth.userIn,orderController.couponDiscount)
router.post('/remove-coupon',auth.userIn,orderController.removeCoupon)

//wallet

router.get('/wallet',auth.loadCommonData,walletController.getWalletPage)
router.post('/razorpay-order',auth.userIn,orderController.placeOrder)

//razorpay
router.post('/verify-payment',auth.userIn,orderController.verifyPayment);
router.get('/payment-failure',auth.userIn,auth.loadCommonData,orderController.orderFail)

router.post('/payment-failure',auth.userIn,orderController.paymentFail)
router.get('/retry-payment/:orderId',auth.userIn,orderController.retryPayment)

 









module.exports=router
