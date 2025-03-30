const User=require('../models/userSchema')
const { body, validationResult } = require("express-validator");

const userIn=async(req,res,next)=>{
    try {
        if(req.session.user){
            next()
        }
        else{
            res.redirect('/login')
        }
    } catch (error) {

        console.log(error)
        
    }

}

const userNotIn=async(req,res,next)=>{
    try {
        if(!req.session.user){
            next()
        }
        else{
            res.redirect('/')
        }
    } catch (error) {
        console.log(error)
        
    }
}


const validateProfile = [
    body("fullName").isLength({ min: 3 }).withMessage("Full name must be at least 3 characters long."),
    body("phone").matches(/^\d{10}$/).withMessage("Enter a valid 10-digit phone number."),
    body("city").notEmpty().withMessage("City is required."),
    body("state").notEmpty().withMessage("State is required."),
    body("place").notEmpty().withMessage("Place is required."),
    body("pincode").matches(/^\d{6}$/).withMessage("Enter a valid 6-digit pincode."),
    body("address").isLength({ min: 5 }).withMessage("Address must be at least 5 characters long."),
];

// Middleware to check validation results
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};





module.exports={userIn,userNotIn,validateProfile,validate}