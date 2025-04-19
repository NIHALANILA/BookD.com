const Order = require('../models/orderSchema') 
const moment = require('moment');

async function getSalesReport({ filterType, fromDate, toDate }) {
  try {
    let matchStage = {
      status: { $ne: 'cancelled' }
    };

    if (filterType) {
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
          throw new Error("Invalid filterType");
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
          bestSellingBooks: [
            { $unwind: "$orderItems" },
            {
              $group: {
                _id: "$orderItems.bookId",
                totalQuantitySold: { $sum: "$orderItems.quantity" },
                totalOfferdiscount: { $sum: "$orderItems.discount" }
              }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "books",
                localField: "_id",
                foreignField: "_id",
                as: "bookDetails"
              }
            },
            { $unwind: "$bookDetails" },
            {
              $project: {
                _id: 1,
                totalQuantitySold: 1,
                totalOfferdiscount: 1,
                bookName: "$bookDetails.title"
              }
            }
          ]
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
