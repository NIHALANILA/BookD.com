const Coupon = require('../models/couponSchema');

const applyCoupon = async ({ couponCode, userId, subtotal }) => {

    try {

        
        const coupon = await Coupon.findOne({
            code: couponCode,
            isActive: "yes",
            isDeleted: false,
            expireDate: { $gte: new Date() },
            minimumPrice: { $lte: subtotal },
           
            
        });
    
        if (!coupon) {
            
            return { valid: false, message: "Invalid or expired coupon" };
        }
    
         
         if (coupon.issuedTo && coupon.issuedTo.toString() !== userId.toString()) {        //ensuring that the user is eligible for refered coupon
            return { valid: false, message: "This coupon is not valid for your account" };
        }
    
         
         const userUsed = coupon.usersUsed.includes(userId) && coupon.limitPerUser; //filtering those used coupons which is onetime usable
    
         if (userUsed) {
             
             return { valid: false, message: "You have already used this coupon" };
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
    
     
    
        return {
            valid: true,
            discount,
            couponId: coupon._id
        };
        
    } catch (error) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${error.message}`);
        

        
    }

   
};

module.exports={applyCoupon}