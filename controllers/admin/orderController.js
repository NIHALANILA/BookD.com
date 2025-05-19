const Order=require('../../models/orderSchema')
const Book = require("../../models/bookSchema");
const mongoose = require('mongoose');
const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const { refundToWallet } =require('../../helpers/walletHelper')
const Coupon=require('../../models/couponSchema');
const { success } = require( '../../middleware/auth' );



const listOrders = async (req, res) => {
    try {
        const search = req.query.search || '';
        const status = req.query.status || '';
        const page = parseInt(req.query.page) || 1;
        const perPage = 10;

        const query = {};

       
        if (search) {
            
            const users = await User.find({
                email: { $regex: search, $options: 'i' }
            }).select('_id');

            const userIds = users.map(u => u._id);

           
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { userId: { $in: userIds } }
            ];
        }

        
        if (status) {
            query.status = status;
        }

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / perPage);

        const orders = await Order.find(query)
            .populate('userId', 'email')
            .sort({ orderDate: -1 })     
            .skip((page - 1) * perPage)
            .limit(perPage);

        res.render('ordermanage', {
            orders,
            currentPage: page,
            totalPages,
            search,
            status,
            perPage,
            successMessage: req.flash('success'),
            errorMessage: req.flash('error')
        });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).send("Internal Server Error");
    }
};


const orderview=async(req,res)=>{
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId)
          .populate('userId')
          .populate('addressId')
          .populate('orderItems.bookId');

          if (!order) {
            return res.status(404).send("Order not found");
          }
          res.render('orderview', { order });
    
    } catch (error) {

        console.error("Order details error:", err);
        res.status(500).send("Internal server error");
        
    }
}


const statusEdit = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      

      const allowedStatusupdate={
        processing:["delivered","shipped"],
        shipped:["delivered"],
        returned:[],                                        // for preventing accidental updates
        "Partial return":[],
        cancelled:[],
        orderRequested:["returned","rejected"],
        itemRequested:["Partial return","rejected"],
        rejected:["returned","Partial return"],
        delivered:["orderRequested"],
        initiated:[]
      }
  
      const order = await Order.findById(id).populate("couponId"); 
  
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      
      const currentstatus=order.status;

      if(!allowedStatusupdate[currentstatus].includes(status)){
        return res.status(400).json({
          success:false,
          message:`can't change status from ${currentstatus} to ${status}`

        })
      }

      if(status==="delivered"&&( order.status==='processing'||order.status==='shipped')){
        for(const item of order.orderItems){
          if(item.status==='Ordered'){
            item.status ='Delivered'
          }
        }
        
      }

  
      // in complete order return just return full amount but not shipping charge and just keep order data as it is for refarance
      if (status === "returned" && order.status !== "returned") {
        for (const item of order.orderItems) {
          if(item.status==='Requested'){
            
            await Book.findByIdAndUpdate(item.bookId, {
              $inc: { stock: item.quantity },
            });
            item.status='Returned'
          }
          
        }
  
        await refundToWallet(order.userId, order.netAmount - order.shippingCharge);
      }
  
      // in partial return we need to do some calculation in refunding price(to wallet) and order need to update 
      if (status === "Partial return" && order.status !== "Partial return") {

        let existingItems= order.orderItems.filter(i=>i.status!=="Returned" && i.status!=='Cancelled')
        
        if(existingItems.length===1){
          return orderReturnFromItem(req,res,order)
        }
        
        let returnTotal = 0;
        let remainingTotal = 0;
        let proportionalDiscount = 0;
        let newTax=0;
        let returnTax=0;
        for (const item of order.orderItems) {
          if (item.status === "Requested") {
            await Book.findByIdAndUpdate(item.bookId, {
              $inc: { stock: item.quantity },
            });
            item.status = "Returned";
            returnTotal += item.totalPrice;
            
            
          }
        }
        returnTax=returnTotal*(0.05)
        const coupon = order.couponId;

        for (const item of order.orderItems) {
          if (item.status === "Delivered") {
            remainingTotal += item.totalPrice;
          }
        }
        newTax = remainingTotal * 0.05;
  
        if (!coupon) {
          
          const refundAmount =Number((returnTotal + returnTax).toFixed(2)) ;
          await refundToWallet(order.userId, refundAmount);
         

        } else {
          const { discountType, discountValue, minimumPrice } = coupon;
  
          
         
          if (remainingTotal < minimumPrice) {
            // coupon condition broken so deduct the applied discount on order
            const refundAmount = Number((returnTotal - order.discount+returnTax).toFixed(2))

            proportionalDiscount=order.discount; //so in this, discount will be updated to zero
           

            await refundToWallet(order.userId, refundAmount);
            order.discount=0;
          } else {
            // if coupon condition still hold 
            //total value reduced bcz books returned  so discount also need to reduced proportionally
            //calculate proportional discount and update order fields according with this
            
  
            if (discountType === "percentage") {
              proportionalDiscount = (returnTotal * discountValue) / 100;
            } else if (discountType === "fixed") {
              const ratio = returnTotal / order.total;
              proportionalDiscount = ratio * discountValue;
            }
  
            const refundAmount =Number((returnTotal - proportionalDiscount+returnTax).toFixed(2)) ;
            order.discount-=proportionalDiscount
            await refundToWallet(order.userId, refundAmount);
          }
        }
        order.returnedItems++; 
        order.total=remainingTotal;
        order.tax=newTax
        order.netAmount=Number((remainingTotal+newTax+order.shippingCharge-order.discount).toFixed(2));
        
      }
  
      order.status = status;
      await order.save();
  
      res.json({ success: true, message: "Order status updated" });
  
    } catch (error) {
      console.error("Failed to update order status:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  
  async function orderReturnFromItem(req,res,order){
   

    try {
      order.status="returned";
      order.returnReason="non of item needed"

      for (const item of order.orderItems) {
        if(item.status==='Requested'){
          await Book.findByIdAndUpdate(item.bookId, {
            $inc: { stock: item.quantity },
          });
        item.status='Returned'
        }
        
      }
      await refundToWallet(order.userId, order.netAmount - order.tax);
      await order.save(); 
      return res.json({success:true,message:"Enitire order marked as returned"})
      
    } catch (error) {
      console.error('errorr in last item return from an order',error)
      
    }

  }
module.exports = { listOrders,orderview ,statusEdit};