const mongoose = require('mongoose');
const { Schema } = mongoose;

const bannerSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    banner_img: {
        url: { type: String, required: true }, 
        name: { type: String, required: true }  
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "inactive"
    }
}, { timestamps: true });

const Banner = mongoose.model("Banner", bannerSchema);
module.exports = Banner;
