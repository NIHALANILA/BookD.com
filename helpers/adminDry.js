const Category=require('../models/categorySchema')



const checkAndRestoreCategory = async (name, excludeId = null) => {     //excluded given to reuse this same function incase of edit category 
          try {
            
            const query = { name };
    if (excludeId) {
        query._id = { $ne: excludeId }; 
    }

    const existingCategory = await Category.findOne(query);

    if (existingCategory) {
        if (existingCategory.isDeleted) {
            existingCategory.isDeleted = false;
            existingCategory.deleted_at = null;
            await existingCategory.save();
            return { restored: true, category: existingCategory };
        } else {
            return { exists: true };
        }
    }

    return { exists: false };
          } catch (error) {
            console.error(`[ERROR] ${new Date().toISOString()} - ${error.message}`);
           res.status(500).send("Something went wrong.");
          }                                                                                                                                     
    
};

module.exports={checkAndRestoreCategory}