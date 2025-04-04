const Order=require('../../models/orderSchema')
const Book = require("../../models/bookSchema");
const Category = require("../../models/categorySchema");
const mongoose = require('mongoose');
const path = require("path");
const fs=require('fs')
const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')



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
            message: totalOrders === 0 ? 'No orders found.' : null,
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
       await Order.findByIdAndUpdate(id,{status})
       req.flash('success', 'Order status updated successfully!');
       res.redirect('/admin/orders')
    } catch (error) {

        console.error('Failed to update order status:', error);
    res.status(500).send("Internal Server Error");
        
    }
}
module.exports = { listOrders,orderview ,statusEdit};