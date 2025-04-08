const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const {checkUserSession} = require('../../helpers/userDry')
const Books = require('../../models/bookSchema');
const mongoose = require('mongoose');
const Cart=require('../../models/cartSchema')
const Wishlist=require('../../models/wishlistSchema')




const addcart = async (req, res) => {
    try {
        const bookId = req.body.bookId;
        const quantity = parseInt(req.body.quantity) || 1;

        const user = await checkUserSession(req);
        if (!user) {
            req.flash("error", "Please log in to add items to the cart.");
            return res.redirect("/login");
        }

        const book = await Books.findById(bookId);
        if (!book || book.isDeleted || !book.isListed) {
            req.flash("error", "This book is unavailable.");
            return res.redirect("/cart");
        }

        if (book.stock <= 0) {
            req.flash("error", "This book is out of stock.");
            return res.redirect("/cart");
        }

        let cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            cart = new Cart({ userId: user._id, items: [] });
        }

        const existingItem = cart.items.find(item => item.bookId.equals(bookId));

        if (existingItem) {
            if (existingItem.quantity + quantity > book.stock) {
                req.flash("error", `Only ${book.stock} copies are available.`);
                return res.redirect("/cart");
            }
            existingItem.quantity += quantity;
            existingItem.totalPrice = existingItem.quantity * book.price;
        } else {
            if (quantity > book.stock) {
                req.flash("error", `Only ${book.stock} copies are available.`);
                return res.redirect("/cart");
            }
            cart.items.push({
                bookId,
                quantity,
                price: book.price,
                totalPrice: book.price * quantity,
                
            });
        }

        await cart.save();
        await Wishlist.findOneAndDelete({ user_id: user._id, book_id: bookId });
        req.flash("success", "Item added to cart.");
        res.redirect("/cart");

    } catch (error) {
        
        req.flash("error", "Something went wrong.");
        res.redirect("/cart");
    }
};


const viewCart = async (req, res) => {
    try {
        const user = await checkUserSession(req);
        if (!user) return res.redirect("/login");

        const cart = await Cart.findOne({ userId: user._id }).populate("items.bookId");
        if (!cart || cart.items.length === 0) {
            return res.render("cart", { cartItems: [], totalPrice: 0, outOfStock: false });
        }

        let totalPrice = 0;
        let outOfStock = false;

        const cartItems = cart.items.map(item => {
            totalPrice += item.price * item.quantity;
            if (item.bookId.stock < item.quantity) outOfStock = true;

            return {
                _id: item.bookId._id,
                title: item.bookId.title,
                price: item.price,
                quantity: item.quantity,
                totalPrice: item.price * item.quantity,
                stock: item.bookId.stock,
                imageUrl: item.bookId.book_images[0] 
            };
        });

        res.render("cart", { cartItems, totalPrice, outOfStock });
    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect("/cart");
    }
};

const updateCart=async(req,res)=>{
    try {
        const {bookId,action}=req.body;
        const user=await checkUserSession(req)
        if(!user) return res.redirect('/')

        let cart= await Cart.findOne({userId:user._id}) .populate("items.bookId")  
        if(!cart) return res.json({success:false,message:"cart not found"})

        let item=cart.items.find(item=>item.bookId._id.toString()===bookId)
        if(!item) return res.json({success:false,message:"item not found"})

        if(action==="increase"&&item.quantity<item.bookId.stock){
            item.quantity+=1
        }
       
        
        else if(action==="decrease"&&item.quantity>1){
            item.quantity-=1
        }
        else {
            return res.json({success:false,message:"Invalid action"})
        }

        await cart.save()
        let totalPrice = cart.items.reduce((sum, item) => sum + item.bookId.price * item.quantity, 0);
        res.json({ success: true, newQuantity: item.quantity, totalPrice, stock: item.bookId.stock });
        
    } catch (error) {

        console.error(error);
        res.json({ success: false, message: "Something went wrong" });
        
    }
}
const removecart=async(req,res)=>{
    try {
        const user= await checkUserSession(req)
        if(!user) return res.redirect('/login')
        const {bookId}=req.body;
       let cart=await Cart.findOne({userId:user._id});
       if(!cart) return res.json({success: false, message: "Cart not found"})

        cart.items=cart.items.filter(item=>item.bookId.toString()!==bookId)
        await cart.save()
        let totalPrice=cart.items.reduce((sum,item)=>sum+item.price*item.quantity,0)
        res.json({ success: true, totalPrice });
    } catch (error) {

        console.error(error);
        res.json({ success: false, message: "Something went wrong" });
        
    }
}

const loadWishlist = async (req, res) => {
    try {
        
        const user= await checkUserSession(req)
        if(!user) return res.redirect('/login')
        

        const wishlistItems = await Wishlist.find({ user_id:user }).populate('book_id');

        res.render('wishlist', { wishlistItems });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Something went wrong!');
    }
};

const addWishlist=async(req,res)=>{
    try {
        console.log("Wishlist Form Submitted")
        const user= await checkUserSession(req)
        if(!user) return res.redirect('/login')
            const { bookId } = req.body;
        console.log("Book ID Received:", bookId);

        const existing = await Wishlist.findOne({ user_id:user, book_id: bookId });
        if (existing) {
            return res.status(409).json({ message: 'Already in wishlist' });
            console.log("Book already in wishlist"); 
        }

        const wishlistItem = new Wishlist({
            user_id:user,
            book_id: bookId
        });

        await wishlistItem.save();
        console.log("Wishlist Item Saved ✅");
        res.redirect('/wishlist'); 
        

    } catch (error) {

        console.error('Error adding to wishlist:', error);
    res.status(500).send('Internal Server Error');
        
    }
}

const deleteWishlist=async(req,res)=>{
    try {
        await Wishlist.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting wishlist item:', error);
    res.status(500).json({ success: false });
    }
}

module.exports={addcart,viewCart,updateCart,removecart,loadWishlist,addWishlist,deleteWishlist}