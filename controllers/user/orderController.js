
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
const Wallet=require('../../models/walletSchema')





const buynow = async (req, res) => {
    try {
        const user = await checkUserSession(req);
        if (!user) return res.redirect('/login');

        const { bookId } = req.body;
        const book = await Books.findById(bookId);

        if (!book) {
            req.flash("error", "Book not found");
            return res.redirect('/shop');
        }

        if (book.stock === 0) {
            return res.redirect(`/book/${book._id}`);
        }

        const offer = await getBestOffer(bookId);
        const discountedPrice = offer.finalPrice;

        const item = {
            bookId: book.id,
            title: book.title,
            price: book.price,
            discountedPrice,
            quantity: 1,
            totalPrice: discountedPrice,
            bookImage: book.book_images[0]
        };

        // Save to session instead of rendering directly
        req.session.buyNowItem = item;
        req.session.buyNowSubtotal = discountedPrice;

        return res.redirect('/checkout');

    } catch (error) {
        console.error(error);
        
        return res.redirect('/shop');
    }
};

const loadcheckout = async (req, res) => {
    try {
        const user = await checkUserSession(req);
        if (!user) return res.redirect('/login');

        const addresses = await Address.find({ userId: user._id });
        const userId = user._id;
        const source = req.body.source;

              if (source === 'cart') {             //if user give up direct buy now and proceed checkout from cart
                                                                            
          delete req.session.buyNowItem;
          delete  req.session.buyNowSubtotal;
                       }

        let cartItems = [];
        let subtotal = 0;

        

        if (req.session.buyNowItem) {
            // Handle Buy Now flow
            const item = req.session.buyNowItem;
            cartItems = [item];
            subtotal = req.session.buyNowSubtotal || item.discountedPrice;

            // Clear buyNow data after rendering
            
        } else {
            // Regular cart flow
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
                        'bookData.stock': 1,
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

            const outOfStockItems = cart
                .filter((item) => item.quantity > item.bookData.stock)
                .map((item) => item.bookData._id);

            if (outOfStockItems.length > 0) {
                await Cart.updateOne(
                    { userId: user._id },
                    { $pull: { items: { bookId: { $in: outOfStockItems } } } }
                );
            }

            const filteredCarts = cart.filter((item) => item.quantity <= item.bookData.stock);

            cartItems = await Promise.all(filteredCarts.map(async (item) => {
                const fullBook = await Books.findById(item.bookData._id);
                const offerData = await getBestOffer(fullBook);

                return {
                    ...item,
                    discount: offerData?.discount || 0,
                    discountedPrice: offerData?.finalPrice || item.totalPrice
                };
            }));

            subtotal = cartItems.reduce((sum, item) => sum + item.discountedPrice * item.quantity, 0);
        }

        req.session.subtotal = subtotal;
        const tax = subtotal * 0.05;
        const shippingCharge = 50;
        const finalTotal = subtotal + tax + shippingCharge;

        const coupons = await Coupon.find({
            isActive: "yes",
            expireDate: { $gte: new Date() },
            minimumPrice: { $lte: subtotal },
            isDeleted: false,
            $or: [
                {
                    issuedTo: null,
                    $or: [
                        { limitPerUser: false },
                        { limitPerUser: true, usersUsed: { $nin: [userId] } }
                    ]
                },
                {
                    issuedTo: userId,
                    $or: [
                        { limitPerUser: false },
                        { limitPerUser: true, usersUsed: { $nin: [userId] } }
                    ]
                }
            ]
        });

        res.render('checkout', {
            user,
            cartItems,
            addresses,
            subtotal,
            tax,
            shippingCharge,
            finalTotal,
            coupons,
            session: req.session
        });

    } catch (error) {
        console.error("Checkout error:", error);
       res.redirect('/pageNotFound')
    }
};

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
        const shippingCharge=50
        const finalTotal = subtotal + tax+shippingCharge - result.discount;

    
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

    try {
        delete req.session.appliedCoupon;

    
    const subtotal = req.session.subtotal || 0;
    const shippingCharge=50;
    const tax = subtotal * 0.05;
    const finalTotal = subtotal + tax+shippingCharge;

    
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
        

        const { book, quantity,  addressId, paymentMethod} = req.body;
        
        
        
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
            
            if(bookQuantity>bookDetails.stock){
                return res.status(404).json({message:'out of stock'})
            }
            if(bookDetails.isDeleted||!bookDetails.isListed){
                return res.status(404).json({message:'this book is unavailable'})
            }

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
                if(!item.bookId||item.bookId.stock<item.quantity) continue;
                
                const offer=await getBestOffer(item.bookId._id);
                const finalPrice=offer ? offer.finalPrice:item.bookId.price;
                const offerId=offer?offer.offerId:null;
                const totalPrice=item.quantity*finalPrice;
                const discount=offer ? offer.discount:0

                if(item.quantity>item.bookId.stock){
                    return res.status(404).json({message:`${item.bookId.title} is out of stock`})
                }
            if(item.bookId.isDeleted||!item.bookId.isListed){
                return res.status(404).json({message:`${item.bookId.title} is currently unavailable`})
            }

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

       subtotal = Math.round(subtotal.toFixed(2));
        tax = Math.round(tax.toFixed(2));
        netAmount = Math.round(netAmount.toFixed(2));
        totalDiscount = Math.round(totalDiscount.toFixed(2));

        if (paymentMethod === "cod" && netAmount > 1000) {
            return res.status(400).json({ success: false, message: "COD is not allowed for orders above ₹1000." });
          }
          

         if (paymentMethod === "wallet") {
            let wallet = await Wallet.findOne({ userId });
        
            if (!wallet || wallet.balance < netAmount) {
                return res.status(400).json({ success: false, message: 'insufficient wallet balance' });
            }
        
            // Proceed to create the order only after validation
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
                discount: totalDiscount,
                couponApplied:totalDiscount,
                couponId: appliedCoupon
            });
        
            const savedOrder = await newOrder.save();

            if(!savedOrder){
                return res.status(500).json({success:false,message:'order failed'})
            }
        
            wallet.balance -= netAmount;
            wallet.transactions.push({
                type: 'debit',
                amount: netAmount,
                date: new Date(),
                note: `debited for purchasing order-${savedOrder.orderId}`
            });
        
           const walletSaved= await wallet.save();

           if(!walletSaved){                  //if walletdeduction procedure not success delete the order 
            await Order.findByIdAndDelete(savedOrder._id)
            return res.status(500).send('Wallet update failed')
           }
        
            if (appliedCoupon) {
                await Coupon.updateOne({ _id: appliedCoupon }, {
                    $push: { usersUsed: userId },
                    $inc: { usedCount: 1 }
                });
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
         if(book){
            delete req.session.buyNowItem;
            delete req.session.buyNowSubtotal;
         }
            return res.json({ success: true, orderId: savedOrder._id });
        }
        

        
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
            couponApplied:totalDiscount,
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
          
              return res.status(200).json({
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
       
       
        if(book){
            delete req.session.buyNowItem;
            delete req.session.buyNowSubtotal;
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

            if (req.session.buyNowItem) {
                delete req.session.buyNowSubtotal;
                delete req.session.buyNowItem;
               
            }
            else{
                await Cart.deleteMany({ userId: updatedOrder.userId._id });

            }
            delete req.session.appliedCoupon;

            
               
            
            
           

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
        await refundToWallet(order.userId, order.netAmount,`Refund for cancelled order ${order.orderId}`);
      }

        res.json({ success: true });
        
    } catch (error) {
        console.error(" Error in orderCancel:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

const returnOrder=async(req,res)=>{
    try {
        

        const { returnReason } = req.body;
        

        if (!returnReason) {
            return res.status(400).json({ success: false, message: "Return reason is required" });
        }

        const order= await Order.findById(req.params.id)
        if(!order||order.status!=="delivered"){
            return res.status(400).json({ success: false, message: "Only delivered orders can be returned" });
        }

        order.status = "orderRequested";
        order.returnReason = returnReason;

        order.orderItems.forEach(item=>{
            if(item.status==='Delivered'){
                item.status="Requested";
                item.returnReason=returnReason
            }
        })
        

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

        const doc = new PDFDocument({ margin: 50 });
        const filename = `invoice-${orderId}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        doc.pipe(res);

        // Title
        doc.fontSize(20).text("BookD", { align: "center" }).moveDown();

        // Order Summary
        doc.fontSize(14).text(`Order ID: ${order.orderId}`);
        doc.text(`Order Date: ${order.createdAt.toDateString()}`);
        doc.text(`Order Status: ${order.status === "rejected" ? "Delivered (Return request rejected - please contact)" : order.status}`);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Included Items: ${order.orderItems.length - (order.cancelledItems || 0) - (order.returnedItems || 0)}`);
        if (order.cancelledItems) doc.text(`Cancelled Items: ${order.cancelledItems}`);
        if (order.returnedItems) doc.text(`Returned Items: ${order.returnedItems}`);
        doc.moveDown();

        // Shipping Address
        doc.fontSize(16).text("Shipping Address", { underline: true });
        doc.fontSize(12).text(`Name: ${order.addressId.name}`);
        doc.text(`Address: ${order.addressId.address}, ${order.addressId.city}`);
        doc.text(`State & Pincode: ${order.addressId.state} - ${order.addressId.pincode}`);
        doc.text(`Phone: ${order.addressId.phone}`);
        doc.moveDown();

        // Items Table (Single Table with 5 columns and multiple rows)
        doc.fontSize(16).text("Items Ordered", { underline: true }).moveDown(0.5);

        const tableTop = doc.y + 10;
        const titleX = 50;
        const qtyX = 200;
        const priceX = 270;
        const discountX = 350;
        const statusX = 420;
        const rowHeight = 25;
        const tableWidth = 500;

        // Table Header (Single Table)
        doc.fontSize(12).text("Title", titleX, tableTop)
            .text("Qty", qtyX, tableTop)
            .text("Price", priceX, tableTop)
            .text("Discount", discountX, tableTop)
            .text("Status", statusX, tableTop);

        // Header underline
        doc.moveTo(titleX, tableTop + 15).lineTo(tableWidth, tableTop + 15).stroke();

        let y = tableTop + 20;

        // Table Rows for each item
        order.orderItems.forEach((item) => {
            const status = item.status || "Ordered";
            const title = item.bookId.title;
            const qty = item.quantity.toString();
            const price = `${item.price.toFixed(2)}`;
            const discount = `${item.discount.toFixed(2)}`;

            // Draw table row borders for a single table
            doc.rect(titleX, y, 150, rowHeight).stroke();
            doc.rect(qtyX, y, 70, rowHeight).stroke();
            doc.rect(priceX, y, 80, rowHeight).stroke();
            doc.rect(discountX, y, 70, rowHeight).stroke();
            doc.rect(statusX, y, 80, rowHeight).stroke();

            // Write cell text with proper alignment
            doc.fontSize(10).text(title, titleX + 5, y + 5, { width: 140, ellipsis: true });
            doc.text(qty, qtyX + 5, y + 5);
            doc.text(price, priceX + 5, y + 5);
            doc.text(discount, discountX + 5, y + 5);
            doc.text(status, statusX + 5, y + 5);

            y += rowHeight;
        });

        doc.moveDown();

               // Summary Section Table
               const summaryTop = y + 10; // y was updated after last item row
               const labelX = titleX;
               const valueX = labelX + 250; // Space between label and value columns
               const summaryRowHeight = 25;
               const summaryColWidth = 250;
       
               const summaryItems = [
                   { label: "Discount", value: `${order.discount.toFixed(2)}` },
                   { label: "Tax", value: `${order.tax.toFixed(2)}` },
                   { label: "Shipping Charge", value: `${order.shippingCharge.toFixed(2)}` },
                   { label: "Total Amount", value: `${order.total.toFixed(2)}` },
                   { label: "Amount Paid", value: `${order.netAmount.toFixed(2)}` },
               ];
       
               summaryItems.forEach((item, index) => {
                   const currentY = summaryTop + index * summaryRowHeight;
       
                   // Draw borders
                   doc.rect(labelX, currentY, summaryColWidth, summaryRowHeight).stroke();
                   doc.rect(valueX, currentY, summaryColWidth, summaryRowHeight).stroke();
       
                   // Write text
                   doc.fontSize(12)
                       .text(item.label, labelX + 10, currentY + 7)
                       .text(item.value, valueX + 10, currentY + 7);
               });
       
               y = summaryTop + summaryItems.length * summaryRowHeight + 30; // Update y for spacing after summary
       
        // Conditional Refund Note
        if (order.discount === 0 && order.couponApplied !== 0) {
            doc.fillColor("red").text(
                `Your coupon condition broke, so the full discount  (${order.couponApplied}) was deducted from the refund amount.`,50,y
            );
        } else if (order.discount !== 0 && order.discount < order.couponApplied) {
            doc.fillColor("red").text(
                `Your order total changed. The discounted amount for returned/cancelled items was deducted. Initial coupon: ${order.couponApplied}`,50,y
            );
        }

        doc.end();

    } catch (err) {
        console.error("PDF error:", err);
        res.status(500).send("Could not generate invoice");
    }
};


const orderFail=async(req,res)=>{
    const userId=await checkUserSession(req);
    if(!userId) return res.redirect('/login')
        const orderId=req.query.orderId

    if (!orderId) {
        return res.status(400).send("Order ID is missing.");
    }
    
    res.render('paymentFail',{orderId})
}

const paymentFail=async(req,res)=>{
    const{orderId}=req.body;
    try {
        await Order.findByIdAndUpdate(orderId,{status:"Payment Failed"})
        res.json({success:true})
    } catch (error) {
        console.error('failed payment to mark as payment failed',error)
        res.status(500).json({success:false,message:"internal server error"})
    }
}


const retryPayment = async (req, res) => {
    
    try { 
        
        const order = await Order.findById(req.params.orderId);
        
        
        
        if (!order || order.status !== "Payment Failed") {
            return res.redirect('/');
        }

        
        if (!order.netAmount || order.netAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        
        const razorpayOrder = await razorpayInstance.orders.create({
            amount:  order.netAmount * 100 , 
            currency: "INR",
            receipt: `retry_${order._id.toString().substring(0, 10)}_${Date.now()}`,
        });

        
        if (!razorpayOrder || razorpayOrder.status !== "created") {
            return res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
        }

        
        
        
        res.json({
            success: true,
            key: 'rzp_test_gb3HG6N5Igmh50',
            amount: razorpayOrder.amount,
            razorpayOrderId: razorpayOrder.id,
            savedOrderId: order._id,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
        });

    } catch (error) {
        console.error("Error during retry payment:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const cancelItem=async(req,res)=>{
    const {itemId,reason}=req.body
    
    const orderId = req.params.id;
   

    try {
        const order=await Order.findOne({_id:orderId}).populate("couponId")

        if (!order) {
           
            return res.status(404).send("Order not found.");
          }
        const item= order.orderItems.id(itemId)

        if (!item) {
            
            return res.status(404).send("Item not found in order.");
          }

        if(!item||item.status!=='Ordered'){
            return res.status(400).json({success:false,message:"invalid or already processed item"})

        }
        const existingItems=order.orderItems.filter(i=>i.status==="Ordered")

        if(existingItems.length===1&&existingItems[0]._id.toString()===itemId){
            return orderCancelFromItem(req,res,order,reason)
        }
        if(item.totalPrice<order.discount){
            return res.status(404).json({success:false,message:"this item is not refundable from this order due to coupon condition"})
        }




        item.status='Cancelled';
        item.cancelReason=reason;
        
        await Books.updateOne({_id:item.bookId},{$inc:{stock:item.quantity}})

        let cancelTotal=item.totalPrice;
        let remainingTotal=0;
        let proportionalDiscount=0;
        let returnTax=0;
        let newTax=0

        for(const i of order.orderItems){
            if(i.status==="Ordered"){                   //recalculating and updating order total and other related fields(refer statusedit in admin side-same steps here)
                remainingTotal+=i.totalPrice;
            }
        }
        newTax=remainingTotal*(0.05)
        const coupon=order.couponId;

        if(coupon){

           
            const { discountType, discountValue, minimumPrice } = coupon;

            if(remainingTotal<minimumPrice){
                 
                proportionalDiscount=order.discount;   
                order.discount=0;
            }
            else{
                if(discountType==="percentage"){
                    proportionalDiscount=(cancelTotal*discountValue)/100
                }
                else if(discountType==="fixed"){
                    const ratio=cancelTotal/order.total;
                    proportionalDiscount=ratio*discountValue
                }
                order.discount-=proportionalDiscount
            }
        }

        let refundAmount=0;
        if(order.paymentMethod!=="cod"){
            returnTax=Number((cancelTotal*0.05).toFixed(2))
             refundAmount=cancelTotal+returnTax-proportionalDiscount
           let book = await Books.findById(item.bookId);

            refundAmount = Number(refundAmount.toFixed(2));                                              //if payment was through online or wallet 
            await refundToWallet(order.userId,refundAmount,`Refund for cancelling ${book.title} from order ${order.orderId}`)
        }
        
         
        order.total=remainingTotal;
        order.cancelledItems++;
        order.tax=newTax   
        order.netAmount=Number((remainingTotal+order.tax+order.shippingCharge-order.discount).toFixed(2))
         

        

        await order.save()


       

        res.json({success:true})
    } catch (error) {
         console.error('cancelling item error',error)
          return res.status(500).json({message:"Something went wrong"})
       
        
    }
}

async function orderCancelFromItem(req,res,order,reason){
    try {
        order.status="cancelled"
        order.cancelReason=reason;
        await order.save()

        for(let item of order.orderItems){
            if(item.status==="Ordered"){
                 item.status = "Cancelled"
                await Books.findByIdAndUpdate(item.bookId,{$inc:{stock:item.quantity}})
            }
            
        }

        if(order.paymentMethod!=="cod"){
            await refundToWallet(order.userId,order.netAmount,`refund for the last item in the order ${order.orderId}`)
        }

        return res.json({success:true,message:"Enitire order cancelled"})
    } catch (error) {
        return res.status(500).json({success:false,message:"server error"})
        
    }
}

const returnItem=async(req,res)=>{
    try {
         
        const orderId=req.params.id;
        const{itemId,reason}=req.body;
       
        const order= await Order.findById({_id:orderId})
 
        if(!order){
            return res.status(404).send('order not found')
        }

        const item= order.orderItems.id(itemId)

        if(!item||item.status!=="Delivered"){
            return res.status(404).json({success:false,message:"invalid or not delivered item"})

        }
        //not allow the book which price fall below coupon discount
        if(item.totalPrice<order.discount){
            return res.status(404).json({success:false,message:"this item is not refundable from this order due to coupon condition"})
        }

        const existingItems=order.orderItems.filter(i=>i.status!=="Cancelled" && i.status!=="Returned" && i.status!=="Requested")

        if(existingItems.length===1 && existingItems[0]._id.toString()===itemId){

            order.status="orderRequested";
            item.status="Requested";
            order.returnReason=reason;
        }
        else{

            item.status="Requested",
           item.returnReason=reason;
            order.status="itemRequested"

        }
        

        await order.save()

        res.json({success:true})
    } catch (error) {
        console.error(error,"error in returnItem")
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}
module.exports={loadcheckout,buynow,placeOrder,orderSuccess,orderList,orderCancel,returnOrder,downloadInvoice,
    couponDiscount,removeCoupon,verifyPayment,orderFail,paymentFail,retryPayment,cancelItem,returnItem}