const Order = require('../models/orderSchema') 
const moment = require('moment');

async function getSalesReport({ filterType, fromDate, toDate }) {
  try {
    let matchStage = {
      status: {$in: ['delivered', 'requested','Partial return'] }
    };

    if (filterType&& filterType !== 'all') {
      let startDate, endDate;

      switch (filterType) {
        case 'today':
          startDate = moment().startOf('day').toDate();
          endDate = moment().endOf('day').toDate();
          break;
        case 'week':
          startDate = moment().startOf('week').toDate();
          endDate = moment().endOf('week').toDate();
          break;
        case 'month':
          startDate = moment().startOf('month').toDate();
          endDate = moment().endOf('month').toDate();
          break;
        case 'year':
          startDate = moment().startOf('year').toDate();
          endDate = moment().endOf('year').toDate();
          break;
        case 'custom':
          if (fromDate && toDate) {
            startDate = new Date(fromDate);
            endDate = new Date(toDate);
          } else {
            throw new Error("Custom filter requires fromDate and toDate");
          }
          break;
        default:
          console.warn("Unknown filterType, ignoring date filter")
      }

      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    const result = await Order.aggregate([
      { $match: matchStage },
      {
        $facet: {
          statusCounts: [
            { $group: { _id: "$status", count: { $sum: 1 },totalAmount:{$sum:"$total"} } }
          ],
          totalMetrics: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: "$total" },
                netSales: { $sum: "$netAmount" },
                totalOrderDiscount: { $sum: "$discount" },
                totalCouponUsed: {
                  $sum: {
                    $cond: [{ $ifNull: ["$couponId", false] }, 1, 0]
                  }
                }
              }
            }
          ],
          
          orderDetails: [
            {
              $lookup: {
                from: "users",   
                localField: "userId",  
                foreignField: "_id",    
                as: "userDetails"
              }
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },  // Unwind userDetails
            {
              $project: {
                userId: 1,
                status: 1,
                orderItems: 1,
                discount: 1,
                netAmount:1,
                paymentMethod:1,
                createdAt: 1,
                updatedAt: 1,
                username:"$userDetails.username" , 
                email:"$userDetails.email"  
              }
            },

            { 
              $sort: { createdAt: -1 }  
            }
            
          ],
         
        }
      }
    ]);

    return {
      result: result[0],
      dateRange: matchStage.createdAt || null,
      computedFrom: matchStage.createdAt?.$gte || null,
      computedTo: matchStage.createdAt?.$lte || null,
    };

  } catch (error) {
    throw error;
  }
}
 
module.exports = { getSalesReport };
