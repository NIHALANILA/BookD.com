const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Books = require('../../models/bookSchema');

const loadShopage = async (req, res) => {
    try {
        let userData = null;
        if (req.session.user) {
            userData = await User.findOne({ username: req.session.user.username });
        }
        let filterTitle = "All Books";
        
        const categories = await Category.find({});

        
        const { filter, category, language, minPrice, maxPrice, page,search,clearSearch } = req.query;
         
        if (clearSearch) {
            return res.redirect("/shop");
        }


        let booksQuery = { isDeleted: false, isListed: true };

        
        
        if (category) {
            const categoryData = await Category.findOne({ name: category });
            console.log("Category Data Found:", categoryData); // Debugging output

            if (categoryData) {
                booksQuery.category_ids = { $in: [categoryData._id] }; // Use $in since category is an array
                filterTitle=`Category: ${categoryData.name}`
            }
        }

        // Filter by language
        if (language) {
            booksQuery.language = language;
        }

        // Filter by price range
        if (minPrice || maxPrice) {
            booksQuery.price = {};
            if (minPrice) booksQuery.price.$gte = parseInt(minPrice);
            if (maxPrice) booksQuery.price.$lte = parseInt(maxPrice);
        }
       
        // Apply search filter (title, author, publisher)
        if (search) {
            booksQuery.$or = [
                { title: { $regex: search, $options: "i" } },
                { author: { $regex: search, $options: "i" } },
                { publisher: { $regex: search, $options: "i" } }
            ];
            filterTitle = `Search Results for: "${search}"`;
        }


        // Sorting logic
        let sortQuery = {};
        

        if (filter === "newArrivals") {
            sortQuery = { _id: -1 }; // Newest first
            filterTitle = "New Arrivals";
        } else if (filter === "bestSellers") {
            const bestSellerCategory = await Category.findOne({ name: "bestselling" });
            if (bestSellerCategory) {
                booksQuery.category = { $in: [bestSellerCategory._id] };
            }
            filterTitle = "Best Sellers";
        }

        // Pagination setup
        const pageSize = 6;
        const currentPage = parseInt(page) || 1;
        const totalBooks = await Books.countDocuments(booksQuery);
        const totalPages = Math.ceil(totalBooks / pageSize);

        // Fetch books with pagination
        const books = await Books.find(booksQuery)
            .sort(sortQuery)
            .skip((currentPage - 1) * pageSize)
            .limit(pageSize);

        // Pass categories to EJS template
        res.render('shop', { 
            user: userData, 
            books, 
            filterTitle, 
            currentPage, 
            totalPages, 
            categories ,// Passing categories correctly
            searchQuery: search || ""
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};


module.exports = { loadShopage };
