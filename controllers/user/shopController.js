const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Books = require('../../models/bookSchema');
const mongoose = require('mongoose');
const {checkUserSession} = require('../../helpers/userDry')



const loadHome=async(req,res)=>{
    try{
              
       const userData = await checkUserSession(req)


        
        const { search } = req.query;
        
        const newArrivals= await Books.find({isDeleted:false,isListed:true}).sort({createdAt: -1})
    
       let bestSellers = [];
       const bestSellerCategory = await Category.findOne({ name: "Best Seller" });

      if (bestSellerCategory) {
     bestSellers = await Books.find({
        isDeleted: false,
        isListed: true,
        category_ids: { $in: [bestSellerCategory._id] } 
       }).sort({ edition: -1 });
}
 
        return res.render('home',{user:userData,newArrivals,bestSellers, searchQuery: search || "" })
    
    }
    catch(error){
        console.log(error)

    }
}


const loadShopage = async (req, res) => {
    try {
       
       const userData= await checkUserSession(req)
        let filterTitle = "All Books";
        
        const categories = await Category.find({isDeleted:false,isListed:true});
        const publishers = await Books.distinct("publisher", { isDeleted: false, isListed: true });

        
        const { filter, category, language, minPrice, maxPrice, page,search,clearSearch,publisher,sort } = req.query;
         
        if (clearSearch) {
            return res.redirect("/shop");
        }


        let booksQuery = { isDeleted: false, isListed: true };

        
        
        if (category) {
            const categoryData = await Category.findOne({ name: category });
            

            if (categoryData) {
                booksQuery.category_ids = { $in: [categoryData._id] }; 
                filterTitle=`Category: ${categoryData.name}`
            }
        }

        if (req.query.publisher) {
            booksQuery.publisher = req.query.publisher;
        }

        
        if (language) {
            booksQuery.language = language;
        }
        


        
        if (minPrice || maxPrice) {
            booksQuery.price = {};
            if (minPrice) booksQuery.price.$gte = parseInt(minPrice);
            if (maxPrice) booksQuery.price.$lte = parseInt(maxPrice);
        }
       
       
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
            sortQuery = { _id: -1 }; 
            filterTitle = "New Arrivals";
        } 
        
        
        if (sort === "priceLow") {
            sortQuery = { price: 1 }; 
            filterTitle = "Price: Low to High";
        } else if (sort === "priceHigh") {
            sortQuery = { price: -1 };
            filterTitle = "Price: High to Low";
        } else if (sort === "az") {
            sortQuery = { title: 1 }; 
            filterTitle = "A-Z (Title)";
        } else if (sort === "za") {
            sortQuery = { title: -1 }; 
            filterTitle = "Z-A (Title)";
        }
        // Pagination setup
        const pageSize = 6;
        const currentPage = parseInt(page) || 1;
        const totalBooks = await Books.countDocuments(booksQuery);
        const totalPages = Math.ceil(totalBooks / pageSize);

        
        const books = await Books.find(booksQuery)
            .sort(sortQuery)
            .skip((currentPage - 1) * pageSize)
            .limit(pageSize);

        
        res.render('shop', { 
            user: userData, 
            books, 
            filterTitle, 
            currentPage, 
            totalPages, 
            categories ,
            publishers,
            searchQuery: search || "",
            sortQuery
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};


const viewBookDetails = async (req, res) => {
    try {
     
       const userData= await checkUserSession(req)
  const bookId = req.params.id;
  const { search } = req.query;

  

  
  if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).send("Invalid Book ID");
  }

  const bookData = await Books.findOne({ _id: bookId });

  if (!bookData) {
      return res.status(404).send("Book not found");
  }
  const categories = await Category.find({ _id: { $in: bookData.category_ids } });
  const categoryNames = categories.map(category => category.name).join(", ");
    
    const categoryArray = Array.isArray(bookData.category_ids) ? bookData.category_ids : [];
    


        let relatedBooks = [];
const maxRelatedBooks = 4; 

if (categoryArray.length > 0) {
    // Fetch books by the same author first
    relatedBooks = await Books.find({
        author: bookData.author,
        language: bookData.language, // Ensure same language
        _id: { $ne: bookId }, 
        isDeleted: false, 
        isListed: true
    }).limit(maxRelatedBooks);

    // If not enough books found by author, fill with books from same category
    if (relatedBooks.length < maxRelatedBooks) {
        const additionalBooks = await Books.find({
            category_ids: { $in: categoryArray },
            language: bookData.language, // Ensure same language
            _id: { $ne: bookId },
            isDeleted: false, 
            isListed: true,
            author: { $ne: bookData.author } // Avoid duplicates
        })
        .limit(maxRelatedBooks - relatedBooks.length);

        relatedBooks = [...relatedBooks, ...additionalBooks]; 
    }
}

        
  res.render('book-view', { user: userData,data: bookData,  relatedBooks: relatedBooks||[], searchQuery: search || "",categoryNames });
} catch (err) {
  console.error("Error fetching book details:", err);
  res.status(500).send("Internal Server Error");
}
};



module.exports = { loadShopage,viewBookDetails,loadHome };
