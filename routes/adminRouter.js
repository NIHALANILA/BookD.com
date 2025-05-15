const express=require('express')
const router=express.Router()
const adminController=require('../controllers/admin/adminController')
const adminAuth=require('../middleware/admin')
const customerController=require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController');
const offerController=require('../controllers/admin/offerController')
const bookController= require('../controllers/admin/bookController')
const { upload, processImages } = require("../helpers/multerHelper");
const orderController=require('../controllers/admin/orderController')
const couponController=require('../controllers/admin/couponController')
const salesController=require('../controllers/admin/salesController')




router.get('/login',adminAuth.adminNotIn,adminController.loadlogin)
router.post('/login',adminController.login)
router.get('/dashboard',adminAuth.adminIn,adminController.loaddashboard)
router.get('/logout',adminController.logout)

//customerController

router.get('/customers',adminAuth.adminIn,customerController.customerlist)
router.patch('/block/:id',adminAuth.adminIn,customerController.blockCustomer)
router.patch('/unblock/:id',adminAuth.adminIn,customerController.unBlockCustomer)
router.get('/messages',adminAuth.adminIn,customerController.messageHandle)
router.delete('/messages/:id',adminAuth.adminIn,customerController.resolveMsg)


//category

router.get("/categories",adminAuth.adminIn, categoryController.listCategories);
router.post("/categories",adminAuth.adminIn, categoryController.addCategory);
router.patch("/categories/edit/:id",adminAuth.adminIn, categoryController.editCategory);
router.patch("/categories/delete/:id",adminAuth.adminIn, categoryController.softDeleteCategory);
router.patch("/categories/toggle/:id",adminAuth.adminIn, categoryController.toggleCategory);






//books manage

router.get("/books",adminAuth.adminIn, bookController.listbooks);
router.get("/books/add",adminAuth.adminIn, bookController.loadaddbook);
router.post("/books/add",adminAuth.adminIn, upload.array("images", 5), processImages, bookController.addbook);


router.get('/books/edit/:id',adminAuth.adminIn,bookController.loadeditbook)
router.post('/books/edit/:id',adminAuth.adminIn,upload.array("images", 5), processImages, bookController.editbook)
router.delete('/books/:id',adminAuth.adminIn,bookController.softDeletebook)
router.patch('/books/:id',adminAuth.adminIn,bookController.toggleBook)

//ordermanage

router.get('/orders',adminAuth.adminIn,orderController.listOrders)
router.get('/orders/view/:id',adminAuth.adminIn,orderController.orderview)
router.patch('/orders/:id',adminAuth.adminIn,orderController.statusEdit)

//offermanage

router.get("/offers",adminAuth.adminIn, offerController.listOffers);
router.get("/offers/add",adminAuth.adminIn, offerController.addOfferForm);
router.post("/offers/add",adminAuth.adminIn, offerController.addOffer);
router.get("/offers/edit/:id",adminAuth.adminIn,offerController.loadupdateoffer)
router.patch("/offers/edit/:id",adminAuth.adminIn,offerController.editOffers)
router.delete('/offers/delete/:id',adminAuth.adminIn,offerController.deleteOffer)


//coupon

router.get('/coupons',adminAuth.adminIn,couponController.listCoupons)
router.get('/coupons/add',adminAuth.adminIn,couponController.loadaddCoupon)
router.post('/coupons/add',adminAuth.adminIn,couponController.addCoupon)
router.get('/coupons/:id',adminAuth.adminIn,couponController.loadEditCoupon)
router.patch('/coupons/:id',adminAuth.adminIn,couponController.editCoupon)
router.delete('/coupons/:id',adminAuth.adminIn,couponController.deleteCoupon)


//saleReport

router.get('/sales',adminAuth.adminIn,salesController.loadSaleReport)
router.get('/sales/excel',adminAuth.adminIn,salesController.saleReportExcel)
router.get('/sales/pdf',adminAuth.adminIn,salesController.saleReportPDF)

module.exports=router