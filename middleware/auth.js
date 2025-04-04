const User=require('../models/userSchema')
const {checkUserSession} = require('../helpers/userDry')
const Cart = require("../models/cartSchema");


const userIn=async(req,res,next)=>{
    try {
        if(req.session.user){
            next()
        }
        else{
            res.redirect('/login')
        }
    } catch (error) {

        console.log(error)
        
    }

}

const userNotIn=async(req,res,next)=>{
    try {
        if(!req.session.user){
            next()
        }
        else{
            res.redirect('/')
        }
    } catch (error) {
        console.log(error)
        
    }
}

 

const loadCommonData = async (req, res, next) => {
    try {
        // Get User Data (if logged in)
        const userData = await checkUserSession(req);

        // Get Cart Data (if user is logged in)
        let cart = { items: [] }; // Default empty cart
        if (userData) {
            const cartData = await Cart.findOne({ userId: userData._id }).populate("items.bookId");
            if (cartData) cart = cartData;
        }

        // Get Search Query (if any)
        const searchQuery = req.query.search || "";

        // Attach Data to `res.locals` (available in all EJS templates)
        res.locals.user = userData;
        res.locals.cart = cart;
        res.locals.searchQuery = searchQuery;

        next(); // Continue to next middleware or route handler
    } catch (error) {
        console.error("Error loading common data:", error);
        next(); // Prevent errors from breaking the app
    }
};

const success=async(req,res)=>{

    res.render('ordSuccess',{order:res.locals.order,isOrderSuccess:true})

}

const view=async(req,res)=>{

    res.render('ordSuccess',{order:res.locals.order,isOrderSuccess:false})

}











module.exports={userIn,userNotIn,loadCommonData,success,view}