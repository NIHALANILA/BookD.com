const Category=require('../../models/categorySchema')
const {checkAndRestoreCategory}=require('../../helpers/adminDry')





const listCategories = async (req, res) => {
    try {
        const searchQuery = req.query?.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const query = { isDeleted: false }; 
        if (searchQuery) {
            query.name = { $regex: searchQuery, $options: "i" };
        }

        const totalCategories = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / limit);

        const categories = await Category.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        let message = "";
        if (categories.length === 0) {
            message = `No results found for "${searchQuery}".`;
        }

        res.render("categorymanage", { categories, searchQuery, totalPages, currentPage: page, message });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading categories");
    }
};
const addCategory = async (req, res) => {
    try {
        const { name } = req.body;
         name = name.trim().toLowerCase();
        const result = await checkAndRestoreCategory(name);

        if (result.restored) {
            return res.redirect("/admin/categories"); // If restored, stop here
        } else if (result.exists) {
            return res.status(400).send("Category with this name already exists.");
        }

        await Category.create({ name });
        res.redirect("/admin/categories");
    } catch (error) { 
        console.error(error);
        res.status(500).send("Error adding category");
    }
};



const editCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const categoryId = req.params.id;

        const result = await checkAndRestoreCategory(name, categoryId);

        if (result.restored) {
            return res.json({ success: true, message: "Category restored successfully" });
        } else if (result.exists) {
            return res.status(400).json({ success: false, message: "Category with this name already exists." });
        }

        await Category.findByIdAndUpdate(categoryId, { name });
        res.json({ success: true, message: "Category updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:"error updating category"});
    }
};


const softDeleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send("Category not found");
        }

        category.isDeleted = true;
        category.deleted_at = new Date();
        await category.save();

        res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error deleting category");
    }
};

const toggleCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send("Category not found");
        }
        category.isListed = !category.isListed;
        await category.save();
        res.json({ success: true, message: "Category status updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating category status");
    }}

    module.exports = { listCategories, addCategory, editCategory, softDeleteCategory ,toggleCategory};