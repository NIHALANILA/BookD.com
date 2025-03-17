const express=require('express')
const router=express.Router()
const adminController=require('../controllers/admin/adminController')
const adminAuth=require('../middleware/admin')
const customerController=require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController');
const offerController=require('../controllers/admin/offerController')
const bookController= require('../controllers/admin/bookController')
const { upload, processImages } = require("../helpers/multerHelper");








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
router.patch("/categories/delete/:id",adminAuth.adminIn, categoryController.softDeleteCategory);
router.patch("/categories/toggle/:id",adminAuth.adminIn, categoryController.toggleCategory);




//offermanage--need to work more

router.get("/offers", offerController.getOffers);
router.get("/offers/add", offerController.addOfferForm);
router.post("/offers/add", offerController.addOffer);
router.get("/offers/edit/:id",offerController.loadupdateoffer)
router.put("/offers/edit/:id",offerController.updateOffers)

//books-not completed

router.get("/books", bookController.listbooks);
router.get("/books/add", bookController.loadaddbook);
router.post("/books/add", upload.array("images", 5), processImages, bookController.addbook);




module.exports=router