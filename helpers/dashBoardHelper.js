
const Order = require('../models/orderSchema');
const moment = require('moment');

async function dashBoard({ filterType, fromDate, toDate }) {
  try {
    let matchStage = {};

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
            throw new Error('Custom filter requires fromDate and toDate');
          }
          break;
        default:
          console.warn('Unknown filterType, ignoring date filter');
      }

      matchStage.createdAt = { $gte: startDate, $lte: endDate };
    }

    const result = await Order.aggregate([
      {
        $match: matchStage,
      },
      {
        $facet: {
          statusCount: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalAmount: { $sum: "$netAmount" }
              }
            }
          ],
          totalMetrics: [
            {
              $group: {
                _id: null,
                totalOrder: { $sum: 1 },
                netSales: { $sum: "$netAmount" },
                totalOrderDiscount: { $sum: "$discount" }
              }
            }
          ],
          bookDetails: [
            { $unwind: "$orderItems" },
            { $match: { "orderItems.status": "Delivered" } },
            {
              $group: {
                _id: "$orderItems.bookId",
                totalQuantitySold: { $sum: "$orderItems.quantity" },
                totalPrice:{$sum:"$orderItems.price"},
                totalOfferDiscount: { $sum: "$orderItems.discount" }

              }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 },
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
                totalOfferDiscount: 1,
                totalPrice:1,
                bookName: "$bookDetails.title",
                publisher: "$bookDetails.publisher",
                Author: "$bookDetails.author"
              }
            }
          ],
          categoryDetails: [
            { $unwind: "$orderItems" },
            { $match: { "orderItems.status": "Delivered" } },
            {
              $lookup: {
                from: "books",
                localField: "orderItems.bookId",
                foreignField: "_id",
                as: "book"
              }
            },
            { $unwind: "$book" },
            { $unwind: "$book.category_ids" },
            {
              $group: {
                _id: "$book.category_ids",
                totalQuantitySold: { $sum: "$orderItems.quantity" },
                totalPrice:{$sum:'$orderItems.price'}

              }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "category"
              }
            },
            { $unwind: "$category" },
            {
              $project: {
                _id: 1,
                totalQuantitySold: 1,
                totalPrice:1,
                categoryName: "$category.name"
              }
            }
          ],
          publicationDetails: [
            { $unwind: "$orderItems" },
            { $match: { "orderItems.status": "Delivered" } },
            {
              $lookup: {
                from: "books",
                localField: "orderItems.bookId",
                foreignField: "_id",
                as: "book"
              }
            },
            { $unwind: "$book" },
            {
              $group: {
                _id: "$book.publisher",
                totalQuantitySold: { $sum: "$orderItems.quantity" },
                totalPrice:{$sum:"$orderItems.price"}
              }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 5 }
          ],
          authorDetails: [
            { $unwind: "$orderItems" },
            { $match: { "orderItems.status": "Delivered" } },
            {
              $lookup: {
                from: "books",
                localField: "orderItems.bookId",
                foreignField: "_id",
                as: "book"
              }
            },
            { $unwind: "$book" },
            {
              $group: {
                _id: "$book.author",
                totalQuantitySold: { $sum: "$orderItems.quantity" },
                totalPrice:{$sum:"$orderItems.price"}
              }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 5 }
          ],
          
          orderDetails: [
            {
              $match: {
                status: { $in: ["delivered", "Partial return"] }
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userDetails"
              }
            },
            {
              $unwind: {
                path: "$userDetails",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                userId: 1,
                status: 1,
                orderItems: 1,
                discount: 1,
                netAmount: 1,
                paymentMethod: 1,
                createdAt: 1,
                updatedAt: 1,
                username: "$userDetails.username",
                email: "$userDetails.email"
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
    console.error("Dashboard aggregation error:", error);
    throw error;
  }
}


module.exports={dashBoard}