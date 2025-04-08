const Book = require('../models/bookSchema');
const Offer = require('../models/offerSchema');
const mongoose = require('mongoose');

const getBestOffer = async (bookId) => {
  try {
    const book = await Book.findById(bookId).lean();
    if (!book) throw new Error('Book not found');

    const { price, limitPrice, category_ids } = book;

    const currentDate = new Date();

    // Find all valid active offers
    const offers = await Offer.find({
      status: 'active',
      start_date: { $lte: currentDate },
      expire_date: { $gte: currentDate },
      $or: [
        { applyTo: 'book', book_ids: book._id },
        { applyTo: 'category', category_id: { $in: category_ids } }
      ]
    }).lean();

    let maxDiscount = 0;
    let appliedOffer = null;

    for (const offer of offers) {
      const discount = (offer.discount_type === 'percentage')
        ? Math.round((offer.discount_value / 100) * price)
        : 0;

      // Ensure discount doesn't go below limit price
      if ((price - discount) >= limitPrice && discount > maxDiscount) {
        maxDiscount = discount;
        appliedOffer = offer;
      }
    }

    // If no valid discount found, apply max possible discount till limit price
    if (maxDiscount === 0) {
      maxDiscount = price - limitPrice;
    }

    return {
      originalPrice: price,
      limitPrice,
      discount: maxDiscount,
      finalPrice: price - maxDiscount,
      offerId: appliedOffer ? appliedOffer._id : null
    };
  } catch (err) {
    console.error('Error in getBestOffer:', err);
    return null;
  }
};

module.exports = { getBestOffer };
