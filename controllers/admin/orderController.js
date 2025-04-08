const Order=require('../../models/orderSchema')
const Book = require("../../models/bookSchema");
const mongoose = require('mongoose');
const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const { refundToWallet } =require('../../helpers/walletHelper')



const listOrders = async (req, res) => {
    try {
        const search = req.query.search || '';
        const status = req.query.status || '';
        const page = parseInt(req.query.page) || 1;
        const perPage = 5;

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

const statusEdit=async(req,res)=>{
    try {
       const {id} =req.params;
       const {status}=req.body

       const order = await Order.findById(id);

       if(status==="returned"&& order.status!=="returned"){

        for (const item of order.orderItems){
            await Book.findByIdAndUpdate(item.bookId,{
                $inc:{stock:item.quantity}
            })
        }
        await refundToWallet(order.userId, order.total);

       }
      
       order.status=status;

       await order.save();
       res.json({ success: true, message: 'Order status updated' });
      
    } catch (error) {

        console.error('Failed to update order status:', error);
    res.status(500).send("Internal Server Error");
        
    }
}
module.exports = { listOrders,orderview ,statusEdit};