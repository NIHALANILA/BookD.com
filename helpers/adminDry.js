const Category=require('../models/categorySchema')



const checkAndRestoreCategory = async (name, excludeId = null) => {     //excluded given to reuse this same function incase of edit category 
                                                                                                                                               
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
};

module.exports={checkAndRestoreCategory}