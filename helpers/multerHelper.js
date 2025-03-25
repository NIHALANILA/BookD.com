const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Multer Storage (Stores file in memory)
const storage = multer.memoryStorage(); // Store in memory before processing

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed!"), false);
    }
};

const upload = multer({ storage, fileFilter });

// Middleware to process images after upload
/*const processImages = async (req, res, next) => {
    if (!req.files || req.files.length < 3) {
        return res.status(400).json({ message: "At least 3 images are required!" });
    }

    const processedImages = [];

    for (const file of req.files) {
        const filename = `book-${Date.now()}-${Math.round(Math.random() * 1000)}.jpeg`;
        const filepath = path.join(__dirname, "../public/uploads/books", filename);

        await sharp(file.buffer)
            .resize(400, 400) // Resize to 400x400 pixels
            .toFormat("jpeg")
            .jpeg({ quality: 80 }) // Optimize quality
            .toFile(filepath);

        processedImages.push(`uploads/books/${filename}`);
    }

    req.processedImages = processedImages;
    next();
};*/

const processImages = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            req.processedImages = [];  // No new images uploaded
            return next();
        }

        const processedImages = [];

        for (const file of req.files) {
            const filename = `book-${Date.now()}-${Math.round(Math.random() * 1000)}.jpeg`;
            const filepath = path.join(__dirname, "../public/uploads/books", filename);

            await sharp(file.buffer)
                .resize(400, 400) // Resize to 400x400 pixels
                .toFormat("jpeg")
                .jpeg({ quality: 80 }) // Optimize quality
                .toFile(filepath);

            processedImages.push(`uploads/books/${filename}`);
        }

        req.processedImages = processedImages;
        next();
    } catch (error) {
        console.error("Image processing failed:", error);
        res.status(500).json({ message: "Error processing images" });
    }
};

module.exports = { upload, processImages };
