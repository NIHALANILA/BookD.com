const Book = require("../../models/bookSchema");
const Category = require("../../models/categorySchema");

const listbooks = async (req, res) => {
    try {
        let search= req.query?.search||"";
        let page=parseInt(req.query.page)||1;
        const limit=3

        const query = search ?{
            $or:[{title:{$regex:search,$options:"i"}},         //avoid regex search whn serach is empty
                { author: { $regex: search, $options: "i" }, }
               
            ]

        }:{}

        const books= await Book.find(query).sort({createdAt:-1})
        .populate("category_id", "name") 
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
        const categories = await Category.find({ isListed: true });
        res.render("addbook", { categories });
    } catch (error) {
        console.log(error, "add books");
    }
};

const addbook = async (req, res) => {
    try {
        console.log("Uploaded Files:", req.files); 
        const { title, author, category_id, isbn, publisher, language, binding, publishing_date, edition, number_of_pages, price, stock } = req.body;

        if (!title || !author || !category_id || !price || !stock) {
            return res.status(400).json({ message: "Required fields are missing" });
        }
        const processedImages = req.files ? req.files.map(file => file.path) : [];

        if (!req.processedImages || req.processedImages.length < 3) {
            return res.status(400).json({ message: "At least 3 images are required." });
        }

       
        console.log("Processed Images:", req.processedImages);


        const newBook = new Book({
            title,
            author,
            category_id:category_id,
            isbn,
            publisher,
            language,
            binding,
            publishing_date,
            edition,
            number_of_pages,
            price,
            stock,            
            book_images:req.processedImages
        });

        await newBook.save();
        res.redirect("/admin/books");
    } catch (error) {
        console.error(error);
    }
};

module.exports = { listbooks, loadaddbook, addbook };
