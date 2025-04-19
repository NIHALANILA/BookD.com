
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
const {getBestOffer}=require('../../helpers/offerHelper')
const Coupon=require('../../models/couponSchema')
const {applyCoupon}=require('../../helpers/couponHelper')
const razorpayInstance=require('../../helpers/razorpay')
const crypto = require('crypto');



const loadcheckout = async (req, res) => {
    try {
        const user = await checkUserSession(req);
        if (!user) return res.redirect('/login');

        const addresses = await Address.find({ userId: user._id });

        
        

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

            
          const cartItems = await Promise.all(cart.map(async (item) => {
              const fullBook = await Books.findById(item.bookData._id);  
              const offerData = await getBestOffer(fullBook);

                 return {
                 ...item,
               discount: offerData?.discount || 0,
               discountedPrice: offerData?.finalPrice || item.totalPrice
                  };
                       }));

                const subtotal = cartItems.reduce((sum, item) => sum + item.discountedPrice*item.quantity, 0);
                req.session.subtotal = subtotal;     
        

            const tax = subtotal * 0.05;
        
             const userId = user._id

        
        const coupons = await Coupon.find({
            isActive: "yes",
            expireDate: { $gte: new Date() },
            minimumPrice: { $lte: subtotal },
            isDeleted: false,
            $or: [{

                issuedTo:null,
                $or:[ { limitPerUser: false }, 
                    {                              // unlimited coupns always need to show but onetime used never show if it is used and (non refererred copuns)
                      limitPerUser: true,
                      usersUsed: { $nin: [userId] } 
                    }]
                
            },

            {

                issuedTo:userId,
                $or:[ { limitPerUser: false }, 
                    {                              //unlimited coupns always need to show but onetime used never show if it is used- (refered to this user)
                      limitPerUser: true,
                      usersUsed: { $nin: [userId] } 
                    }]
                
            },
               
              ]
           
        });
        
        const finalTotal=subtotal+tax

    
        
        
        res.render('checkout', {
            user,
            cartItems,
            addresses,
            subtotal,
            tax,            
            finalTotal,
            coupons,
            session: req.session
        });

    } catch (error) {
        console.error("Checkout error:", error);  //
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

         const offer=await getBestOffer(bookId);

         const discountedPrice=  offer.finalPrice;


         const addresses= await Address.find({userId:user._id})

         const item={
            bookId:book.id,
            title:book.title,
            price:book.price,
            discountedPrice,
            quantity:1,
            totalPrice:discountedPrice,
            bookImage:book.book_images[0]

         }

      

         const subtotal=discountedPrice;
         const tax=subtotal*0.05;
         
         const finalTotal=subtotal+tax
         req.session.subtotal = subtotal;
         

         const userId = user._id
             
        const coupons = await Coupon.find({
            isActive: "yes",
            expireDate: { $gte: new Date() },
            minimumPrice: { $lte: subtotal },
            isDeleted: false,
            $or: [{

                issuedTo:null,
                $or:[ { limitPerUser: false }, 
                    {                              // unlimited coupns always need to show but onetime used never show if it is used and (non refererred copuns)
                      limitPerUser: true,
                      usersUsed: { $nin: [userId] } 
                    }]
                
            },

            {

                issuedTo:userId,
                $or:[ { limitPerUser: false }, 
                    {                              //unlimited coupns always need to show but onetime used never show if it is used- (refered to this user)
                      limitPerUser: true,
                      usersUsed: { $nin: [userId] } 
                    }]
                
            },
               
              ]
        });

         res.render('checkout',{
            user,
            cartItems:[item],
            addresses,
            subtotal,
            tax,
            finalTotal,
            coupons,
            session:req.session
         })
    } catch (error) {

        console.error(error)
        req.flash('error',"Something went wrong")
        res.redirect('/shop')
        
    }
}

const couponDiscount=async(req,res)=>{

    
    try {
        const user = await checkUserSession(req);
        const { couponCode } = req.body;
        const subtotal = req.session.subtotal;

        if (!subtotal) {
            return res.json({ success: false, error: "Subtotal missing." });
        }

        if (
            req.session.appliedCoupon &&
            req.session.appliedCoupon.code === couponCode
          ) {
            return res.json({ success: false, error: "Coupon already applied." });
          }

        const result = await applyCoupon({
            couponCode,
            userId: user._id,
            subtotal
        });

        if (!result.valid) {
            return res.json({ success: false, error: result.message });
        }

        const tax = subtotal * 0.05;
        const finalTotal = subtotal + tax - result.discount;

    
        req.session.appliedCoupon = {
            code: couponCode,
            discount: result.discount,
            finalTotal,
            couponId: result.couponId,
        };
        res.status(200).json({
            success: true,
            discount: result.discount,
            tax,
            finalTotal
        });

    } catch (error) {
        console.error("Apply Coupon Error:", error);
        res.json({ success: false, error: "Something went wrong." });
    }
}

const removeCoupon=async(req,res)=>{
console.log('remove called')
    try {
        delete req.session.appliedCoupon;

    
    const subtotal = req.session.subtotal || 0;
    const tax = subtotal * 0.05;
    const finalTotal = subtotal + tax;

    
    res.json({
      success: true,
       subtotal,
      tax,
      finalTotal
    });
    } catch (error) {

        console.error("Remove Coupon Error:", error);
    res.status(500).json({ success: false, error: "Failed to remove coupon." });
        
    }
}


const placeOrder = async (req, res) => {    
    try {
        console.log("PaymentMethod received:", req.body.paymentMethod);

        const { book, quantity,  addressId, paymentMethod,couponCode} = req.body;
        
        
        
        const userId = await checkUserSession(req);
        if (!userId) return res.redirect('/login');

        if ( !paymentMethod) {
            return res.status(400).json({ message: ' payment details are required' });
        }
        if ( !addressId) {
            return res.status(400).json({ message: 'Address  details are required' });
        }

        
        let validPaymentId = paymentMethod;
        if (paymentMethod !== "cod" && paymentMethod!=="online"&& paymentMethod!=="wallet") {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        let orderItems = [];
        let subtotal = 0;
        let totalDiscount =0;
        let shippingCharge = 50; 
        let tax = 0;
        let netAmount = 0;
        let appliedCoupon = null;


        if (book) {
            
            const bookDetails = await Books.findById(book); 
            if (!bookDetails) {
                return res.status(404).json({ message: 'Book not found' });
            }

            const bookQuantity = quantity ? parseInt(quantity) : 1;
            const offer = await getBestOffer(bookDetails._id);
            const finalPrice=offer?offer.finalPrice:bookDetails.price
            const totalPrice = bookQuantity * finalPrice; 
            const discount=offer? offer.discount:0;
            const offerId=offer?offer.offerId:null;
            subtotal = totalPrice;
            tax = subtotal * 0.05; 
            

            orderItems.push({
                bookId: bookDetails._id,
                bookTitle: bookDetails.title,
                bookImage: bookDetails.image,
                quantity: bookQuantity,
                price: bookDetails.price,
                totalPrice: totalPrice,
                discount,
                offerId
            });

        } else {
            
            const cart=await Cart.findOne({userId}).populate('items.bookId');
            if(!cart||!cart.items.length){
                return res.status(400).json({message:'cart empty'});

            }

            for(const item of cart.items){
                if(!item.bookId) continue;
                const offer=await getBestOffer(item.bookId._id);
                const finalPrice=offer ? offer.finalPrice:item.bookId.price;
                const offerId=offer?offer.offerId:null;
                const totalPrice=item.quantity*finalPrice;
                const discount=offer ? offer.discount:0
            

            orderItems.push({
                bookId: item.bookId._id,
                bookTitle: item.bookId.title,
                bookImage: item.bookId.image,
                quantity: item.quantity,
                price: item.bookId.price,
                totalPrice,
                discount,
                offerId
              });
      
              subtotal += totalPrice;
              
            }

        }

        tax=subtotal*0.05;
        if (req.session.appliedCoupon) {
            totalDiscount = req.session.appliedCoupon.discount;
            appliedCoupon = req.session.appliedCoupon.couponId;
        }
       

       netAmount=subtotal+tax+shippingCharge-totalDiscount
       const initialStatus = paymentMethod === "online" ? "initiated" : "processing";


        
        const newOrder = new Order({
            userId,
            orderItems,
            status: initialStatus,
            paymentMethod: validPaymentId,
            addressId,
            total: subtotal,
            netAmount,
            shippingCharge,
            tax,
            discount:totalDiscount,
            couponId:appliedCoupon
        });


        const savedOrder = await newOrder.save();

        if (paymentMethod === "online") {
            try {
              
             //follow razorpay verification -status will be default value-initiated
              const razorpayOrder = await razorpayInstance.orders.create({
                amount: netAmount * 100,
                currency: "INR",
                receipt: `order_rcptid_${Date.now()}`
              });
          
              return res.json({
                success: true,
                razorpayOrderId: razorpayOrder.id,
                key: 'rzp_test_gb3HG6N5Igmh50',
                savedOrderId: savedOrder._id,
                customerName: userId.username,
                customerEmail: userId.email,
                customerPhone: userId.phone,
                amount: razorpayOrder.amount
              });
          
            } catch (error) {
              console.error("Error in online payment setup:", error);
          
              
          
              return res.status(500).json({
                success: false,
                message: "Something went wrong while setting up online payment. Please try again later."
              });
            }
          }
          

       
    

        if (appliedCoupon) {
            await Coupon.updateOne(
                { _id: appliedCoupon },
                {
                    $push: { usersUsed: userId },
                    $inc: { usedCount: 1 }
                }
            );
        }
        
        delete req.session.appliedCoupon;

        for (const item of orderItems) {
            await Books.findByIdAndUpdate(item.bookId, {
                $inc: { stock: -item.quantity }
            });
        }
        
       
        
        if (!book) {
            await Cart.deleteMany({ userId });
        }
       

        res.json({
            success: true,
            orderId: savedOrder._id
        });
        

    } catch (error) {
        console.error(' Error placing order:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const verifyPayment=async(req,res)=>{
    try {

        const userId = await checkUserSession(req);
        if (!userId) return res.redirect('/login');
       const { razorpayOrderId, paymentId, signature, orderId } = req.body;
       const secret = 'ECPPAufB9DXrPJD4ExUxcVLF';
   
       const generatedSignature = crypto.createHmac('sha256', secret)
         .update(`${razorpayOrderId}|${paymentId}`)
         .digest('hex');
   
         if (generatedSignature === signature) {
            //if payment verified update other details 
           
            const updatedOrder = await Order.findByIdAndUpdate(orderId, {
                status: 'processing',
                paymentId
            }, { new: true }).populate('userId');

            
            for (const item of updatedOrder.orderItems) {
                await Books.findByIdAndUpdate(item.bookId, {
                    $inc: { stock: -item.quantity }
                });
            }

            
            if (updatedOrder.couponId) {
                await Coupon.updateOne(
                    { _id: updatedOrder.couponId },
                    {
                        $push: { usersUsed: updatedOrder.userId._id },
                        $inc: { usedCount: 1 }
                    }
                );
            }

            
            await Cart.deleteMany({ userId: updatedOrder.userId._id });

            res.json({ success: true });
        } else {
            res.json({ success: false, message: "Signature mismatch" });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
      }
}

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
     res.locals.order=order; //so this same logic can use both for order success and view order detail of particular boook dependupon next 
     next();
    

        
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
       
        
      if (order.paymentMethod === 'online' || order.paymentMethod === 'wallet') {
        await refundToWallet(order.userId, order.netAmount);
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

        
        doc.end();

    } catch (err) {
        console.error("PDF error:", err);
        res.status(500).send("Could not generate invoice");
    }
};





module.exports={loadcheckout,buynow,placeOrder,orderSuccess,orderList,orderCancel,returnOrder,downloadInvoice,couponDiscount,removeCoupon,verifyPayment}