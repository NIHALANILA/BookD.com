const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Books = require('../../models/bookSchema');
const mongoose = require('mongoose');
const {checkUserSession} = require('../../helpers/userDry')
const {getBestOffer}=require('../../helpers/offerHelper')
const Contact=require('../../models/contactSchema')



const loadHome=async(req,res)=>{
    try{
        
              
       const userData = await checkUserSession(req)        
        
        const newArrivals= await Books.find({isDeleted:false,isListed:true,stock: { $gt: 0 }}).sort({createdAt: -1}).lean()
    
       let bestSellers = [];
       const bestSellerCategory = await Category.findOne({ name: "Best Seller" });

      if (bestSellerCategory) {
        bestSellers = await Books.find({
        isDeleted: false,
        isListed: true,
        stock: { $gt: 0 },
        category_ids: { $in: [bestSellerCategory._id] } 
       }).sort({ edition: -1 }).lean()

       
}

for (let book of bestSellers) {
    const offer = await getBestOffer(book._id);
    if (offer) {
      book.salePrice = offer.finalPrice;
      
    }
  }
 
  for(let book of newArrivals){
    const offer= await getBestOffer(book._id);
    if(offer){
        book.salePrice=offer.finalPrice
    }
  }
        return res.render('home',{user:userData,newArrivals,bestSellers})
    
    }
    catch(error){
        console.error(error)
       return res.redirect('/pageNotFound')

    }
}


const loadShopage = async (req, res) => {
    try {
       
       const userData= await checkUserSession(req)
        let filterTitle = "All Books";
        
        const categories = await Category.find({isDeleted:false,isListed:true});
        const publishers = await Books.distinct("publisher", { isDeleted: false, isListed: true,stock: { $gt: 0 }});

        
        const { filter, category, language, minPrice, maxPrice, page,search,clearSearch,publisher,sort } = req.query;
        const queryObj = { ...req.query };
        delete queryObj.page;   //deleting page key from queryObj
         
        if (clearSearch) {
            return res.redirect("/shop");
        }


        let booksQuery = { isDeleted: false, isListed: true,stock: { $gt: 0 } };

        
        
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
            .limit(pageSize)
            .lean();

            for (let book of books) {
                const offer = await getBestOffer(book._id);
                if (offer) {
                  book.salePrice = offer.finalPrice;
                  
                }
              }

              const queryString = Object.keys(queryObj)
              .map(key => `${key}=${encodeURIComponent(queryObj[key])}`)  //to create url for pagination
               .join("&");

        res.render('shop', { 
            user: userData, 
            books, 
            filterTitle, 
            currentPage, 
            totalPages, 
            categories ,
            publishers,
            searchQuery: search || "",
            sortQuery,
            queryString, // 
        });

    } catch (error) {
        console.error('error in loading shop page',error.message)
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

  const bookData = await Books.findOne({ _id: bookId }).lean()
  const offer= await getBestOffer(bookData._id)
  if(offer){
    bookData.salePrice= offer.finalPrice;
    bookData.discountPercent = offer.discountPercent;
  }
  



  if (!bookData) {
      return res.status(404).send("Book not found");
  }
  const categories = await Category.find({ _id: { $in: bookData.category_ids } });
  const categoryNames = categories.map(category => category.name).join(", ");
    
    const categoryArray = Array.isArray(bookData.category_ids) ? bookData.category_ids : [];
    


        let relatedBooks = [];
const maxRelatedBooks = 4; 


// first preferance for author
relatedBooks = await Books.find({
    author: bookData.author,
    _id: { $ne: bookId },
    isDeleted: false,
    isListed: true,
    stock: { $gt: 0 }
}).lean().limit(maxRelatedBooks);

//second for category but not different lanaguage
if (relatedBooks.length < maxRelatedBooks && categoryArray.length > 0) {
    const additionalBooks = await Books.find({
        category_ids: { $in: categoryArray },
        language: bookData.language,
        _id: { $ne: bookId },
        isDeleted: false,
        isListed: true,
        stock: { $gt: 0 },
        author: { $ne: bookData.author } // avoid duplicates
    }).lean()
    .limit(maxRelatedBooks - relatedBooks.length);

    relatedBooks = [...relatedBooks, ...additionalBooks];
}
for (const book of relatedBooks) {
    const offer = await getBestOffer(book._id);
    if (offer) {
      book.salePrice = offer.finalPrice;
      book.discountPercent = offer.discountPercent;
    }
  }
  

        
  res.render('book-view', { user: userData,book: bookData,  relatedBooks: relatedBooks||[], searchQuery: search || "",categoryNames });
} catch (err) {
  console.error("Error fetching book details:", err);
  res.status(500).send("Internal Server Error");
}
};

const contact=async(req,res)=>{
    try {
        res.render('contact')
    } catch (error) {
       res.status(500).send({ error: 'Internal server error. Please try again later.' });
 
    }
}

const contactmsg=async(req,res)=>{
    try {
        
        const{name,email,subject,message}=req.body;
        const contact=new Contact({name,email,subject,message})
        await contact.save()
        return res.json({success:true,message:'Message sent successfully'})
    } catch (error) {
        res.render('contact',{error:'Something went wrong,Please try again later'})
    }
}

const returnCancelPolicy=async(req,res)=>{
   try {
     res.render('returnCancel')
   } catch (error) {
    res.render('page404')
   }

}

module.exports = { loadShopage,viewBookDetails,loadHome,contact,contactmsg,returnCancelPolicy };
