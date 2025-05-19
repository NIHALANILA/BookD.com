const User=require('../models/userSchema')
const {checkUserSession} = require('../helpers/userDry')
const Cart = require("../models/cartSchema");
const Wishlist=require('../models/wishlistSchema')


const userIn=async(req,res,next)=>{
    try {
        if(req.session.user){
            next()
        }
        else{
            res.redirect('/login')
        }
    } catch (error) {

        console.error('error in checking user session',error)
        
    }

}

const userNotIn=async(req,res,next)=>{
    try {
        if(!req.session.user&&!req.user){
            next()
        }
        else{
            res.redirect('/')
        }
    } catch (error) {
        console.error(error)
        
    }
}

 //for sharing user,search,cart datas in every pages

const loadCommonData = async (req, res, next) => {
    try {
        
        const userData = await checkUserSession(req);


        let cart = { items: [] }; 
         let wishlistData=[]
        if (userData) {
            const cartData = await Cart.findOne({ userId: userData._id }).populate("items.bookId");
            if (cartData) cart = cartData;
            wishlistData = await Wishlist.find({ user_id: userData._id }); 
            
        }
       

        
        const searchQuery = req.query.search || "";

       
        res.locals.user = userData;
        res.locals.cart = cart;
        res.locals.searchQuery = searchQuery;
        res.locals.cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
        res.locals.wishlistCount = wishlistData.length;


        next(); 
    } catch (error) {
        console.error("Error loading common data:", error);
        next(); 
    }
};
//success message after order place
const success=async(req,res)=>{

    res.render('ordSuccess',{order:res.locals.order,isOrderSuccess:true})

}
//to load the same success page as view details without success message

const view=async(req,res)=>{

    res.render('ordSuccess',{order:res.locals.order,isOrderSuccess:false})

}











module.exports={userIn,userNotIn,loadCommonData,success,view}