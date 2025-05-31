const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");


const storage = multer.memoryStorage(); 

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed!"), false);
    }
};

const upload = multer({ storage, fileFilter });

const uploadProfile=multer({storage,fileFilter}).single('profilePicture')



const processImages = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            req.processedImages = [];  
            return next();
        }

        const processedImages = [];

        for (const file of req.files) {
            const filename = `book-${Date.now()}-${Math.round(Math.random() * 1000)}.jpeg`;
            const filepath = path.join(__dirname, "../public/uploads/books", filename);

            await sharp(file.buffer)
                .resize(190, 250) // 
                .toFormat("jpeg")
                .jpeg({ quality: 100 }) 
                .toFile(filepath);

            processedImages.push(`uploads/books/${filename}`);
        }

        req.processedImages = processedImages;
        next();
    } catch (error) {
        console.error("Image processing failed:", error);
        
    }
};

const processProfileImage=async(req,res,next)=>{
    try {
        if(!req.file){
            req.processedImage = null;
            return next();
        }
         
        const userId = req.session.user ? req.session.user._id : "guest"; 
        const filename = `profile-${userId}-${Date.now()}.jpeg`;
        const filepath = path.join(__dirname, "../public/uploads/profiles", filename);

        await sharp(req.file.buffer)
            .resize(250, 250)
            .toFormat("jpeg")
            .jpeg({ quality: 90 })
            .toFile(filepath);

        req.processedImage = `uploads/profiles/${filename}`;
        next();
    } catch (error) {

        console.error("Profile image processing failed:", error);
        
        
    }
}

module.exports = { upload, processImages,uploadProfile,processProfileImage };