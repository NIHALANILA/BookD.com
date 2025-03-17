const Offer = require("../../models/offerSchema");
const Book = require("../../models/bookSchema")
const Category = require("../../models/categorySchema")
const mongoose = require('mongoose');


//offer management
const getOffers = async (req, res) => {
    try {
        let search = req.query?.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 5; 

        
        const query = search
            ? {
                  $or: [
                      { name: { $regex: search, $options: "i" } },
                      { discountType: { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        
        const totalOffers = await Offer.countDocuments(query);

        
        const offers = await Offer.find(query)
            .populate("book_ids", "title") 
            .populate("category_id", "name") 
            .sort({ createdAt: -1 }) 
            .skip((page - 1) * limit)
            .limit(limit);

        const totalPages = Math.ceil(totalOffers / limit);

        res.render("offermanage", {
            offers,
            search,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading offers");
    }
};

//add offer section

const addOfferForm = async (req, res) => {
    const categories = await Category.find();
    const books = await Book.find();
    res.render("addoffer", { categories, books });
};


const addOffer = async (req, res) => {
    try {
        let { name, book_ids, category_id, discount_type, discount_value, start_date, expire_date,min_purchase_amount} = req.body;
        
        book_ids = Array.isArray(book_ids) ? book_ids.filter(id => mongoose.Types.ObjectId.isValid(id)) : [];
        category_id = mongoose.Types.ObjectId.isValid(category_id) ? category_id : null;

        discount_value = parseFloat(discount_value) || 0;
        min_purchase_amount = parseFloat(min_purchase_amount) || 0;


        if (!name || name.trim() === "") {
            return res.status(400).send("Offer name is required.");
        }
        if (!start_date || !expire_date) {
            return res.status(400).send("Start date and Expire date are required.");
        }

        if (new Date(start_date) >= new Date(expire_date)) {
            return res.status(400).send("Expire date must be after start date.");
        }
        if (book_ids.length === 0 && !category_id) {
            return res.status(400).send("Select at least one book or category.");
        }

        const newOffer = new Offer({ name, book_ids, category_id, discount_type, discount_value, start_date, expire_date,min_purchase_amount });
        await newOffer.save();

        res.redirect("/admin/offers");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding offer");
    }
};


//  Edit Offer section
const loadupdateoffer = async (req, res) => {
    const offer = await Offer.findById(req.params.id);
    const categories = await Category.find();
    const books = await Book.find();
    res.render("updateoffer", { offer, categories, books });
};

// 
const updateOffers = async (req, res) => {
    try {
        let { name, book_ids, category_id, discount_type, discount_value, start_date, expire_date,min_purchase_amount } = req.body;
        
        book_ids = Array.isArray(book_ids) ? book_ids.filter(id => mongoose.Types.ObjectId.isValid(id)) : [];
        category_id = mongoose.Types.ObjectId.isValid(category_id) ? category_id : null;

        if (!name || name.trim() === "") {
            return res.status(400).send("Offer name is required.");
        }
        if (!start_date || !expire_date) {
            return res.status(400).send("Start date and Expire date are required.");
        }

        if (new Date(start_date) >= new Date(expire_date)) {
            return res.status(400).send("Expire date must be after start date.");
        }
        if (book_ids.length === 0 && !category_id) {
            return res.status(400).send("Select at least one book or category.");
        }

        await Offer.findByIdAndUpdate(req.params.id, { name, book_ids, category_id, discount_type, discount_value, start_date, expire_date,min_purchase_amount });

        res.json({ success: true, message: "Offer updated successfully!", redirectUrl: "/admin/offers" });
    }  catch (error) {
        console.error(error);
        res.status(500).send("Error updating offer");
    }
};

// Delete Offer
const deleteOffer = async (req, res) => {
    await Offer.findByIdAndDelete(req.params.id);
    res.redirect("/admin/offers");
};

module.exports = { getOffers, addOfferForm, addOffer, loadupdateoffer, deleteOffer,updateOffers };