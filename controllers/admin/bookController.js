const Book = require("../../models/bookSchema");
const Category = require("../../models/categorySchema");
const mongoose = require('mongoose');
const path = require("path");
const fs=require('fs')
const listbooks = async (req, res) => {
    try {
        let search= req.query?.search||"";
        let page=parseInt(req.query.page)||1;
        const limit=5
        
        const query = { isDeleted: false };


if (search) {

    const matchingCategories = await Category.find({ name: { $regex: search, $options: "i" } });
    const categoryIds = matchingCategories.map(category => category._id);
    query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { category_ids: { $in: categoryIds } } 
    ];
}
      

        const books= await Book.find(query).sort({createdAt:-1})
        .populate("category_ids", "name") 
        .limit(limit)
        .skip((page-1)*limit)    
        .lean();

        const count=await Book.countDocuments(query);
        const totalPages = Math.ceil(count / limit);

        let message = "";
        if (books.length === 0) {
            message = `No results found for "${search}".`;
        }

        res.render("bookmanage",{books,
            search,
            currentPage: page,
            totalPages,
            message});
    } catch (error) {
        console.log(error);
    }
};

const loadaddbook = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true,isDeleted:false });
        res.render("addbook", { categories,message:null });
    } catch (error) {
        console.log(error, "add books");
    }
};

const addbook = async (req, res) => {
    
    try {
        
        const { title, author, category_ids, isbn, publisher, language, binding, publishing_date, edition, number_of_pages, price,salePrice, stock, } = req.body;

        const categories = await Category.find({ isListed: true,isDeleted:false });

         
         if (req.headers["x-requested-with"] === "XMLHttpRequest") {
            const existingBook = await Book.findOne({ isbn });
            if (existingBook) {
                return res.json({ exists: true, message: "This ISBN already exists." });
            }
            return res.json({ exists: false });
        }

        

        if (!title || !author || !category_ids || !price || !stock||!salePrice) {
            return res.status(400).json({ message: "enter all required fields." });
        }
        if(salePrice>price){
            return res.status(400).json({message:"salePrice should be less than or equal to price"})
        }

        
 
        const processedImages = req.files ? req.files.map(file => file.path) : [];

        if (!req.processedImages || req.processedImages.length < 3) {
            return res.status(400).json({ message: "At least 3 images are required." });
        }

       
      

        const newBook = new Book({
            title,
            author,
            category_ids:category_ids,
            isbn,
            publisher,
            language,
            binding,
            publishing_date,
            edition,
            number_of_pages,
            price,
            salePrice,
            stock,            
            book_images:req.processedImages,
            isListed:stock>0
        });

        await newBook.save();
        res.redirect("/admin/books");
    } catch (error) {
        console.error(error);
    }
};
const loadeditbook=async(req,res)=>{
    try {
        const bookId = req.params.id;
    const book = await Book.findById(bookId);
    const categories = await Category.find({isListed:true,isDeleted:false}); 
    res.render('editbook', { book, categories });
    } catch (error) {
        console.log(error)
        
    }
}


const deleteOldImages = (imagePaths) => {
    imagePaths.forEach(imagePath => {
        const fullPath = path.join(__dirname, "../../public", imagePath); 
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath); 
        }
    });
};

const editbook = async (req, res) => {
   
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid Book ID" });
        }
        const bookId = req.params.id;
        const { title, author, category_ids, isbn, publisher, language, binding, publishing_date, edition, number_of_pages, price, stock ,salePrice} = req.body;
        
        
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }


            let updatedImages = [...book.book_images]; 

            if (req.processedImages.length > 0) {
   
           req.processedImages.forEach((newImage, index) => {
        updatedImages[index] = newImage; 
    });
    }


    if (updatedImages.length < 3) {
    return res.status(400).json({ message: "At least 3 images are required." });
   }


        
        let updatedFields = {
            title,
            author,
            category_ids,
            isbn,
            publisher,
            language,
            binding,
            publishing_date,
            edition,
            number_of_pages,
            price,
            salePrice,
            stock,
            isListed: stock > 0, 
            book_images: updatedImages, 
        };

       
        const updatedBook = await Book.findByIdAndUpdate(bookId, { $set: updatedFields }, { new: true });

        if (!updatedBook) {
            console.log("Book update failed!");
            return res.status(500).json({ message: "Book update failed!" });
        }

        res.redirect("/admin/books"); 
    } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).json({ message: "Error updating book" });
    }
};

const softDeletebook=async(req,res)=>{
    try {
        const bookId = req.params.id;
        
        
        const result = await Book.findByIdAndUpdate(bookId, { isDeleted: true });

        if (result) {
            return res.json({ success: true, message: "Book deleted successfully!" });
            
        } else {
            return res.status(404).json({ success: false, message: "Book not found" });
            
        }
    } catch (error) {
        console.error("Error deleting book:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }

}

const toggleBook=async(req,res)=>{
try{

    const book= await Book.findById(req.params.id)
    if(!book){
        return res.status(404).send('book not found')
    }

   
    book.isListed = !book.isListed;
        await book.save();
        res.json({ success: true, message: "book status updated successfully" });
    

}

     catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error updating book status" });
    }
}





module.exports = { listbooks, loadaddbook, addbook ,loadeditbook,editbook,softDeletebook,toggleBook};
