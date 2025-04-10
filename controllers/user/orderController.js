
const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Order=require('../../models/orderSchema')
const {checkUserSession} = require('../../helpers/userDry')
const Books = require('../../models/bookSchema');
const mongoose = require('mongoose');
const Cart=require('../../models/cartSchema');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { refundToWallet } =require('../../helpers/walletHelper')



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
         if(book.stock===0){
            return res.redirect(`/book/${book._id}`)
         }

         const addresses= await Address.find({userId:user._id})

         const item={
            bookId:book.id,
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



const placeOrder = async (req, res) => {    
    try {
        
        const { book, quantity, addressId, paymentMethod} = req.body;
        console.log(paymentMethod)
        
        const userId = await checkUserSession(req);
        if (!userId) return res.redirect('/login');

        if (!addressId || !paymentMethod) {
            return res.status(400).json({ message: 'Address and payment details are required' });
        }

        // Validate paymentId
        let validPaymentId = paymentMethod;
        if (paymentMethod !== "cod" && paymentMethod!=="online"&& paymentMethod!=="wallet") {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        let orderItems = [];
        let subtotal = 0;
        let totalDiscount = 50; 
        let shippingCharge = 50; 
        let tax = 0;
        let netAmount = 0;

        if (book) {
            
            const bookDetails = await Books.findById(book); 
            if (!bookDetails) {
                return res.status(404).json({ message: 'Book not found' });
            }

            const bookQuantity = quantity ? parseInt(quantity) : 1;
            const totalPrice = bookQuantity * bookDetails.price;
            subtotal = totalPrice;
            tax = subtotal * 0.05; 
            netAmount = subtotal + tax - totalDiscount + shippingCharge;

            orderItems.push({
                bookId: bookDetails._id,
                bookTitle: bookDetails.title,
                bookImage: bookDetails.image,
                quantity: bookQuantity,
                price: bookDetails.price,
                totalPrice: totalPrice,
                discount: bookDetails.discount || 0
            });

        } else {
            
            const cartItems = await Cart.findOne({ userId }).populate('items.bookId');  
            if (!cartItems || !cartItems.items.length) {
                return res.status(400).json({ message: 'Cart is empty' });
            }

            orderItems = cartItems.items.map(item => {
                if (!item.bookId) {
                    console.error("Missing bookId for item:", item);
                    return null; 
                }
                const totalPrice = item.quantity * item.price;
                subtotal += totalPrice;
                totalDiscount += item.discount || 0;

                return {
                    bookId: item.bookId._id,
                    bookTitle: item.bookId.title,
                    bookImage: item.bookId.image,
                    quantity: item.quantity,
                    price: item.price,
                    totalPrice: totalPrice,            
                    discount: item.discount || 0,
                };
            }).filter(item => item !== null);

            tax = subtotal * 0.05; 
            netAmount = subtotal + tax - totalDiscount + shippingCharge;
        }

       

        // Create and Save Order
        const newOrder = new Order({
            userId,
            orderItems,
            status: "processing",
            paymentMethod: validPaymentId,
            addressId,
            total: subtotal,
            netAmount,
            shippingCharge,
            tax,
            discount:totalDiscount,
        });

        const savedOrder = await newOrder.save();
        console.log(" Order Saved:", savedOrder);

        for (const item of orderItems) {
            await Books.findByIdAndUpdate(item.bookId, {
                $inc: { stock: -item.quantity }
            });
        }
        

        // If order placed via cart, clear cart
        if (!book) {
            await Cart.deleteMany({ userId });
        }
        res.redirect(`/orders/success/${savedOrder._id}`);
        

    } catch (error) {
        console.error(' Error placing order:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const orderSuccess= async(req,res,next)=>{
    try {

        const userId = await checkUserSession(req);
        if (!userId) return res.redirect('/login');
        
        const { orderId } = req.params;


         
         const order = await Order.findOne({ _id: orderId, userId })
         .populate('orderItems.bookId') 
         .populate('addressId') 
         .populate('paymentMethod'); 

     if (!order) {
         return res.status(404).render('error', { message: 'Order not found' });
     }
     res.locals.order=order;
     next();
    // res.render('ordSuccess', { order }); 

        
    } catch (error) {

        console.error(' Error loading order success page:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
        
    }
}

const orderList=async(req,res)=>{
    try {
        const user=await checkUserSession(req);
        if(!user) return res.redirect('/login')
        
        const orders= await Order.find({userId:user._id}).populate("orderItems.bookId", "title").sort({createdAt:-1})
        res.render('orderListing',{orders})
    } catch (error) {
        console.error("error fetching order",err)

        res.status(500).send('internal server error')
    }
}

const orderCancel=async(req,res)=>{
    try {
        
        const order= await Order.findById(req.params.id)
        if(!order||order.status!=='processing'){
            return res.status(400).json({ message: "Cannot cancel this order." });  

        }
        order.status="cancelled";
        order.cancelReason = req.body.reason;
        await order.save()

        for (let item of order.orderItems) {
            await Books.findByIdAndUpdate(item.bookId, { $inc: { stock: item.quantity } });
        }
       
        // Refund only if prepaid
      if (order.paymentMethod === 'online' || order.paymentMethod === 'wallet') {
        await refundToWallet(order.userId, order.totalAmount);
      }

        res.json({ success: true });
        
    } catch (error) {
        console.error(" Error in orderCancel:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

const returnOrder=async(req,res)=>{
    try {
        console.log("Session in return order:", req.session); 

        const { returnReason } = req.body;
        console.log("Return Reason:", returnReason);

        if (!returnReason) {
            return res.status(400).json({ success: false, message: "Return reason is required" });
        }

        const order= await Order.findById(req.params.id)
        if(!order||order.status!=="delivered"){
            return res.status(400).json({ success: false, message: "Only delivered orders can be returned" });
        }

        order.status = "requested";
        order.returnReason = returnReason;
        

        await order.save();

        res.json({ success: true, message: "Return request submitted" });
                                                                                                                                                                                                                                                                                                                                                                                                                                       
    } catch (error) {
        console.error("Error processing return request:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate("orderItems.bookId")
            .populate("addressId");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        const doc = new PDFDocument();
        const filename = `invoice-${orderId}.pdf`;

        // Set headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        // Pipe the PDF into response
        doc.pipe(res);

        // Create PDF content
        doc.fontSize(20).text("Order Invoice", { align: "center" });
        doc.moveDown();
        doc.fontSize(14).text(`Order ID: ${order.orderId}`);
        doc.text(`Status: ${order.status}`);
        doc.text(`Date: ${order.createdAt.toDateString()}`);
        doc.moveDown();

        doc.text(`Shipping Address:`);
        doc.text(`${order.addressId.name}`);
        doc.text(`${order.addressId.place}, ${order.addressId.city}`);
        doc.text(`${order.addressId.state} - ${order.addressId.pincode}`);
        doc.moveDown();

        doc.text(`Items:`);
        order.orderItems.forEach((item, index) => {
            doc.text(`${index + 1}. ${item.bookId.title} - Qty: ${item.quantity} - ₹${item.bookId.price}`);
        });

        doc.moveDown();
        doc.text(`Total: ₹${order.netAmount}`, { align: "right" });

        // Finalize
        doc.end();

    } catch (err) {
        console.error("PDF error:", err);
        res.status(500).send("Could not generate invoice");
    }
};





module.exports={loadcheckout,buynow,placeOrder,orderSuccess,orderList,orderCancel,returnOrder,downloadInvoice}