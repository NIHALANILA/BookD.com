//const Order=require('../../models/orderSchema')
const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const {checkUserSession} = require('../../helpers/userDry')
const Books = require('../../models/bookSchema');
const mongoose = require('mongoose');
const Cart=require('../../models/cartSchema');
const { session } = require( 'passport' );

/*const loadcheckout=async(req,res)=>{
    try {
        const user=await checkUserSession(req)
        if(!user) return res.redirect('/login')

    const addresses=await Address.find({userId:user._id})

     // Extract product IDs from request body
     const bookIds = req.body.books;
     // Fetch selected products
     const cartItems = await Books.find({ _id: { $in: bookIds} });
     console.log("Cart Items in Checkout:", cartItems);

     // Calculate total price
     let subtotal = 0;
     cartItems.forEach(item => {
        console.log(`Book: ${item.title}, Price: ${item.price}, Quantity: ${item.quantity}`);
         item.totalPrice = item.price * item.quantity; 
         subtotal += item.totalPrice;
     });

     // Tax, discount, and final total
     const tax = subtotal * 0.05;  
     const discount = 50;  
     const finalTotal = subtotal + tax - discount;

     // Render checkout page
     res.render('checkout', { 
        user, 
        cartItems, 
        addresses, 
        subtotal, 
        tax, 
        discount, 
        finalTotal, 
        session: req.session 
    });

        
    } catch (error) {
        
    }
}

const loadcheckout = async (req, res) => {
    try {
        const user = await checkUserSession(req);
        if (!user) return res.redirect('/login');

        const addresses = await Address.find({ userId: user._id });

        // Fetch cart details with book info using aggregation
        const cart = await Cart.aggregate([
            {
                $match: { userId: user._id, status: 'active' } // Match the active cart for the user
            },
            {
                $unwind: "$items" // Unwind the items array
            },
            {
                $lookup: {
                    from: 'books', // Name of the collection in MongoDB
                    localField: 'items.bookId',
                    foreignField: '_id',
                    as: 'bookData' // Fetch book details
                }
            },
            {
                $unwind: "$bookData" // Unwind the bookDetails array to have one object per item
            },
            {
                $project: {
                    'bookData._id': 1,
                    'bookData.title': 1,
                    'bookData.price': 1,
                    'bookData.book_images[0]':1,
                    'items.quantity': 1,
                    'items.totalPrice': { $multiply: ['$items.quantity', '$bookData.price'] }, // Calculate total price for each item
                }
            }
        ]);

        // If cart is empty
        if (!cart || cart.length === 0) {
            req.flash("error", "Your cart is empty.");
            return res.redirect('/books');
        }

        // Calculate subtotal, tax, and discount
        let subtotal = 0;
        cart.forEach(item => {
            subtotal += item.items.totalPrice; // Summing up total price of all items
        });

        const tax = subtotal * 0.05; // Tax
        const discount = 50; // Example discount
        const finalTotal = subtotal + tax - discount;

        // Render checkout page with the data
        res.render('checkout', {
            user,
            cartItems: cart,
            addresses,
            subtotal,
            tax,
            discount,
            finalTotal,
            session: req.session
        });

    } catch (error) {
        req.flash("error", "Something went wrong.");
        res.redirect('/cart');
    }
};*/

const loadcheckout = async (req, res) => {
    try {
        const user = await checkUserSession(req);
        if (!user) return res.redirect('/login');

        const addresses = await Address.find({ userId: user._id });

        let cartItems = [];
        let subtotal = 0;

            const cart = await Cart.aggregate([
                { $match: { userId: user._id, status: 'active' } },
                { $unwind: "$items" },
                {
                    $lookup: {
                        from: 'books',
                        localField: 'items.bookId',
                        foreignField: '_id',
                        as: 'bookData'
                    }
                },
                { $unwind: "$bookData" },
                {
                    $project: {
                        'bookData._id': 1,
                        'bookData.title': 1,
                        'bookData.price': 1,
                        'bookData.book_images': { $arrayElemAt: ['$bookData.book_images', 0] },
                        'quantity': '$items.quantity',
                        'totalPrice': { $multiply: ['$items.quantity', '$bookData.price'] },
                    }
                }
            ]);

            if (!cart || cart.length === 0) {
                req.flash("error", "Your cart is empty.");
                return res.redirect('/books');
            }

            cartItems = cart;
            console.log("Aggregated Cart:", cart);
            subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
        

        const tax = subtotal * 0.05;
        const discount = 50;
        const finalTotal = subtotal + tax - discount;
        console.log("Cart Items:", cartItems);

        res.render('checkout', {
            user,
            cartItems,
            addresses,
            subtotal,
            tax,
            discount,
            finalTotal,
            session: req.session
        });

    } catch (error) {
        req.flash("error", "Something went wrong.");
        res.redirect('/cart');
    }
};

const buynow=async(req,res)=>{
    try {
        const user=await checkUserSession(req);
        if(!user) return res.redirect('/login')

         const {bookId} =req.body;
         const book=await Books.findById(bookId);

         if(!book){
            req.flash("error","Book not found")
            return res.redirect('/shop')
         }

         const addresses= await Address.find({userId:user._id})

         const item={
            booId:book.id,
            title:book.title,
            price:book.price,
            quantity:1,
            totalPrice:book.price,
            bookImage:book.book_images[0]

         }
         const subtotal=book.price;
         const tax=subtotal*0.05;
         const discount=50;
         const finalTotal=subtotal+tax-discount;

         res.render('checkout',{
            user,
            cartItems:[item],
            addresses,
            subtotal,
            tax,
            discount,
            finalTotal,
            session:req.session
         })
    } catch (error) {

        console.error(error)
        req.flash('error',"Something went wrong")
        res.redirect('/shop')
        
    }
}


module.exports={loadcheckout,buynow}