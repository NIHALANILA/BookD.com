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
                      { status: { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        
        const totalOffers = await Offer.countDocuments(query);

        
        const offers = await Offer.find(query)
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
      let {
        name,
        discount_type,
        discount_value,
        applyTo,
        category_id,
        book_ids,
        start_date,
        expire_date,
        status
      } = req.body;
  
      // Convert types
      discount_value = parseFloat(discount_value) || 0;
      book_ids = Array.isArray(book_ids) ? book_ids : book_ids ? [book_ids] : [];
  
      // Validations
      if (!name || !applyTo || !discount_type || !start_date || !expire_date) {
        return res.status(400).send("All required fields must be filled.");
      }
  
      if (new Date(start_date) >= new Date(expire_date)) {
        return res.status(400).send("Expiry date must be after start date.");
      }
  
      const offerData = {
        name,
        discount_type,
        discount_value,
        applyTo,
        start_date,
        expire_date,
        status: status || "inactive",
      };
  
      // Apply based on type
      if (applyTo === "category") {
        if (!category_id || !mongoose.Types.ObjectId.isValid(category_id)) {
          return res.status(400).send("Valid category must be selected.");
        }
        offerData.category_id = category_id;
      } else if (applyTo === "book") {
        const validBookIds = book_ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validBookIds.length === 0) {
          return res.status(400).send("At least one valid book must be selected.");
        }
        offerData.book_ids = validBookIds;
      }
  
      const newOffer = new Offer(offerData);
      await newOffer.save();
  
      res.redirect("/admin/offers");
    } catch (err) {
      console.error("Add Offer Error:", err);
      res.status(500).send("Something went wrong.");
    }
  };
  


//  Edit Offer section
const loadupdateoffer = async (req, res) => {
    const offer = await Offer.findById(req.params.id);
    const categories = await Category.find();
    const books = await Book.find();
    res.render("editOffer", { offer, categories, books });
};

// 
const editOffers = async (req, res) => {
    try {
      const offerId = req.params.id;
      const updatedData = req.body;
  
      // Update logic
      const result = await Offer.findByIdAndUpdate(offerId, updatedData, { new: true });
  
      if (!result) {
        return res.status(404).json({ message: 'Offer not found' });
      }
  
      res.json({ message: 'Offer updated successfully', offer: result });
    }  catch (error) {
        console.error(error);
        res.status(500).send("Error updating offer");
    }
};

// Delete Offer
const deleteOffer = async (req, res) => {
  try {
    console.log('delete function called',req.params.id)
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Offer deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete offer' });
    
  }
  
};

module.exports = { getOffers, addOfferForm, addOffer, loadupdateoffer, deleteOffer,editOffers };