const Coupon = require('../models/couponSchema');

const applyCoupon = async ({ couponCode, userId, subtotal }) => {
    const coupon = await Coupon.findOne({
        code: couponCode,
        isActive: "yes",
        isDeleted: false,
        expireDate: { $gte: new Date() },
        minimumPrice: { $lte: subtotal },
        usersUsed: { $ne: userId }
    });

    if (!coupon) {
        return { valid: false, message: "Invalid or expired coupon" };
    }

    let discount = 0;

    if (coupon.discountType === "percentage") {
        discount = (subtotal * coupon.discountValue) / 100;
    } else if (coupon.discountType === "fixed") {
        discount = coupon.discountValue;
    }

    
    if (discount > subtotal) {
        discount = subtotal;
    }

    await Coupon.updateOne(
        { _id: coupon._id },
        {
            $push: { usersUsed: userId },
            $inc: { usedCount: 1 }
        }
    );

    return {
        valid: true,
        discount,
        couponId: coupon._id
    };
};

module.exports={applyCoupon}