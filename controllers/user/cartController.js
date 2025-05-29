const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const {checkUserSession} = require('../../helpers/userDry')
const Books = require('../../models/bookSchema');
const mongoose = require('mongoose');
const Cart=require('../../models/cartSchema')
const Wishlist=require('../../models/wishlistSchema')
const {getBestOffer}=require('../../helpers/offerHelper')





const addcart = async (req, res) => {
  try {
    const { bookId } = req.body;
    const quantity = parseInt(req.body.quantity) || 1;

    const user = await checkUserSession(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Please log in to add items to the cart." ,redirect: "/login"});
    }

    const book = await Books.findById(bookId);
    if (!book || book.isDeleted || !book.isListed) {
      return res.status(404).json({ success: false, message: "This book is unavailable." });
    }

    if (book.stock <= 0) {
      return res.status(400).json({ success: false, message: "This book is out of stock." });
    }

    const offer = await getBestOffer(book._id);
    const salePrice = offer.finalPrice;

    let cart = await Cart.findOne({ userId: user._id });
    if (!cart) {
      cart = new Cart({ userId: user._id, items: [] });
    }

    const existingItem = cart.items.find(item => item.bookId.equals(bookId));

    if (existingItem) {
      if (existingItem.quantity + quantity > book.stock) {
        return res.status(400).json({ success: false, message: `Only ${book.stock} copies are available which is already added to cart` });
      }
      if(existingItem.quantity + quantity >5){
        return res.json({ success: false, message: "Maximum 5 copies allowed per book." })

      }
      existingItem.quantity += quantity;
      existingItem.totalPrice = existingItem.quantity * salePrice;
    } else {
      if (quantity > book.stock) {
        return res.status(400).json({ success: false, message: `Only ${book.stock} copies are available.` });
      }
      cart.items.push({
        bookId,
        quantity,
        price: salePrice,
        totalPrice: salePrice * quantity
      });
    }

    await cart.save();
    await Wishlist.findOneAndDelete({ user_id: user._id, book_id: bookId });
    const totalItems= cart.items.reduce((total, item) => total + item.quantity, 0);
     const wishlistCount = await Wishlist.countDocuments({ user_id: user._id });

    
    return res.status(200).json({ success: true,totalItems,wishlistCount, message: "Item added to cart." });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Something went wrong." });
    
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

       

        const cartItems = await Promise.all(cart.items.map(async (item) => {
            const book = item.bookId;
            const offer = await getBestOffer(book._id);
            const finalPrice = offer?.finalPrice || item.price;
            const discountPercent = offer?.discountPercent || 0;
           let  itemTotal=0;
            if(book.stock>=item.quantity){
                 itemTotal = finalPrice * item.quantity;
            

            }
            totalPrice += itemTotal;

            if (book.stock < item.quantity) outOfStock = true;

            return {
                _id: book._id,
                title: book.title,
                price: finalPrice,
                originalPrice: book.price,
                discountPercent,
                quantity: item.quantity,
                totalPrice: itemTotal,
                stock: book.stock,
                imageUrl: book.book_images[0]
            };
        }));


        res.render("cart", { cartItems, totalPrice, outOfStock });
    } catch (error) {
        console.error(error);
        
        res.redirect('/pageNotFound');
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

            if (action === "increase") {
                if (item.quantity >= 5) {
                    return res.json({ success: false, message: "Maximum 5 copies allowed per book." });
                }
                if (item.quantity < item.bookId.stock) {
                    item.quantity += 1;
                } else {
                    return res.json({ success: false, message: "No more stock available." });
                }
            }
            
        
        
       
        
        else if(action==="decrease"&&item.quantity>1){
            item.quantity-=1
        }
        else {
            return res.json({success:false,message:"Reached maximum limmit"})
        }

         // 
         const offer = await getBestOffer(bookId);
         const salePrice = offer ? offer.finalPrice : item.bookId.price;

          // Update item's price and total price
        item.price = salePrice;
        item.totalPrice = item.quantity * salePrice;

        const totalPrice = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
 

        await cart.save()
        const totalCarts=cart.items.reduce((tot,item)=>tot+=item.quantity,0)
        
        res.json({ success: true, newQuantity: item.quantity, totalPrice, stock: item.bookId.stock,totalCarts });
        
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
       let cart=await Cart.findOne({userId:user._id})
       if(!cart) return res.json({success: false, message: "Cart not found"})

        cart.items=cart.items.filter(item=>item.bookId.toString()!==bookId)
        await cart.save()
        const offer = await getBestOffer(bookId);
        const salePrice = offer ? offer.finalPrice : item.bookId.price;
         cart = await Cart.findOne({ userId: user._id }).populate("items.bookId");

        const totalPrice = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
        const totalItems=cart.items.filter(item=>item.bookId.stock>0).length
        const totalCarts=cart.items.reduce((tot,item)=>tot+=item.quantity,0)

       
        res.json({ success: true, totalPrice,totalItems,totalCarts });
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
        
        const user= await checkUserSession(req)
        if(!user) return res.status(401).json({ success: false, message: "Please log in to add items to the wishlist .",redirect:'/login' });
            const { bookId } = req.body;
        

        const existing = await Wishlist.findOne({ user_id:user, book_id: bookId });
        if (existing) {
            return res.json({success: false, message: "Book is already in wishlist ." });
            
        }

        const wishlistItem = new Wishlist({
            user_id:user,
            book_id: bookId
        });

        await wishlistItem.save();

        const wishlistCount = await Wishlist.countDocuments({ user_id: user });
        
       return res.status(200).json({ success: true,wishlistCount, message: "Book added to wishlist." });
        

    } catch (error) {

        console.error('Error adding to wishlist:', error);
    res.status(500).send('Internal Server Error');
        
    }
}

const deleteWishlist=async(req,res)=>{
    try {
        const user= await checkUserSession(req)
        await Wishlist.findByIdAndDelete(req.params.id);
        const wishlistCount = await Wishlist.countDocuments({ user_id: user });
    res.status(200).json({ success: true,wishlistCount });
    } catch (error) {
        console.error('Error deleting wishlist item:', error);
    res.status(500).json({ success: false });
    }
}

module.exports={addcart,viewCart,updateCart,removecart,loadWishlist,addWishlist,deleteWishlist}