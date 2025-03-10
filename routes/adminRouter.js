const express=require('express')
const router=express.Router()
const adminController=require('../controllers/admin/adminController')
const adminAuth=require('../middleware/admin')
const customerController=require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController');




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
router.post("/categories/add",adminAuth.adminIn, categoryController.addCategory);
router.patch("/categories/edit/:id",adminAuth.adminIn, categoryController.editCategory);
router.patch("/categories/toggle/:id",adminAuth.adminIn, categoryController.toggleCategory);




module.exports=router