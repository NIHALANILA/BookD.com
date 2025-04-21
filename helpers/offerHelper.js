const Book = require('../models/bookSchema');
const Offer = require('../models/offerSchema');
const mongoose = require('mongoose');

const getBestOffer = async (bookId) => {
  try {
    const book = await Book.findById(bookId).lean();
    if (!book) throw new Error('Book not found');

    const { price, limitPrice, category_ids } = book;

    const currentDate = new Date();

    // find all available offer for that book
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

      // discount shouldn't go beyond limit price  
      if ((price - discount) >= limitPrice && discount > maxDiscount) {
        maxDiscount = discount;
        appliedOffer = offer;
      }
    }

    if (!appliedOffer) {
      // default percent is 5% and it violates limit price then there is no offer
      const defaultDiscount = Math.round(price * 0.05);
      if (price - defaultDiscount >= limitPrice) {
        maxDiscount = defaultDiscount;
      } else {
        maxDiscount = 0;
      }
    }

    const finalPrice = price - maxDiscount;

    return {
      originalPrice: price,
      limitPrice,
      discount: maxDiscount,
      discountPercent: appliedOffer ? appliedOffer.discount_value : (maxDiscount > 0 ? 5 : 0),
      finalPrice: price - maxDiscount,
      offerId: appliedOffer ? appliedOffer._id : null
    };
  } catch (err) {
    console.error('Error in getBestOffer:', err);
    return null;
  }
};

module.exports = { getBestOffer };
