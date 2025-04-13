const Coupon= require('../../models/couponSchema')

const listCoupons=async(req,res)=>{

    try {

        let page=parseInt(req.query.page)||1;
        const limit=5

        const query = { isDeleted: false };
        const coupons = await Coupon.find(query).sort({ createdAt: -1 }).limit(limit)
        .skip((page-1)*limit) 

        const count=await Coupon.countDocuments(query);
        const totalPages = Math.ceil(count / limit);
        res.render('couponmanage', {
          coupons,currentPage: page,
          totalPages,
         
        })
       
        
    } catch (error) {
        console.error(error)
    }
}


const loadaddCoupon=(req,res)=>{
    try {

        res.render('addCoupon', {
            
          });
        
    } catch (error) {
        
    }
}

const addCoupon=async(req,res)=>{
    try {
        console.log('add function called')
        const{code,discountType,discountValue,minimumPrice,limit,expireDate,isActive}=req.body
        const existcoupon= await Coupon.findOne({code:code.trim()})
        if(existcoupon){
            res.status(400).json({ message: "already existing coupon" }); 
        }

        const coupon=new Coupon({code:code.trim().toUpperCase(),discountType,discountValue,minimumPrice,limit,expireDate,isActive})
        await coupon.save()

        res.status(200).json({ message: "Coupon saved successfully!" });
    } catch (error) {
        console.error(error)
        
    }
}

const loadEditCoupon=async(req,res)=>{
    try {
        const coupon = await Coupon.findById(req.params.id);
        res.render('editCoupon',{coupon})
    } catch (error) {
        console.error(error)
    }

}

const editCoupon=async(req,res)=>{
    try {
        const { id } = req.params;
    const {
      code,
      discountType,
      discountValue,
      minimumPrice,
      limit,
      expireDate,
      isActive
    } = req.body;

    const updatedCoupon = await Coupon.findByIdAndUpdate(
        id,
        {
          code,
          discountType,
          discountValue,
          minimumPrice,
          limit,
          expireDate,
          isActive
        },
        { new: true, runValidators: true }
      );

      if (!updatedCoupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
  
      res.status(200).json({ message: "Coupon updated successfully", coupon: updatedCoupon });

    } catch (error) {
        console.error(error)
        
    }
}

const deleteCoupon=async(req,res)=>{
    try {
        await Coupon.findByIdAndUpdate(req.params.id, { isDeleted: true });

        res.status(200).json({ message: "Coupon deleted successfully" });


    } catch (error) {
        console.error("Update error:", err);
    res.status(500).json({ message: "Internal server error" });
        
    }
}
module.exports={listCoupons,loadaddCoupon,addCoupon,loadEditCoupon,editCoupon,deleteCoupon}