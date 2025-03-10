const Category=require('../../models/categorySchema')


const listCategories = async (req, res) => {
    try {
        const searchQuery = req.query?.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const query = searchQuery ? { name: { $regex: searchQuery, $options: "i" } } : {}; // only check in db if searchQuery have value
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

        res.render('categorymanage', { categories, searchQuery, totalPages, currentPage: page ,searchQuery,message});
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading categories");
    }
};


const addCategory = async (req, res) => {
    try {
        const { name } = req.body;
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
        await Category.findByIdAndUpdate(req.params.id, { name });
        res.json({ success: true, message: "Category updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating category");
    }
};


const toggleCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        category.isListed = !category.isListed;
        await category.save();
        res.json({ success: true, message: "Category status updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating category status");
    }}
    module.exports = { listCategories, addCategory, editCategory, toggleCategory };