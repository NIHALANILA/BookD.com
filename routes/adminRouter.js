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








router.get('/login',adminAuth.adminNotIn,adminController.loadlogin)
router.post('/login',adminController.login)
router.get('/dashboard',adminAuth.adminIn,adminController.dashboard)
router.get('/logout',adminController.logout)

//customer

router.get('/customers',adminAuth.adminIn,customerController.customerlist)
router.patch('/block/:id',adminAuth.adminIn,customerController.blockCustomer)
router.patch('/unblock/:id',adminAuth.adminIn,customerController.unBlockCustomer)

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
router.post('/books/delete/:id',adminAuth.adminIn,bookController.softDeletebook)
router.patch('/books/toggle/:id',adminAuth.adminIn,bookController.toggleBook)

//ordermanage

router.get('/orders',orderController.listOrders)
router.get('/orders/view/:id',orderController.orderview)
router.patch('/orders/:id',orderController.statusEdit)

//offermanage--need to work more-no need to do in this week

router.get("/offers", offerController.getOffers);
router.get("/offers/add", offerController.addOfferForm);
router.post("/offers/add", offerController.addOffer);
router.get("/offers/edit/:id",offerController.loadupdateoffer)
router.patch("/offers/edit/:id",offerController.editOffers)
router.delete('/offers/delete/:id',offerController.deleteOffer)

module.exports=router