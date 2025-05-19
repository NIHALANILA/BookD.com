
const nodemailer = require("nodemailer");
const bcrypt=require("bcryptjs")


function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}




async function sendVerificationEmail(email, otp, subject, message) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_NAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.EMAIL_NAME,
            to: email,
            subject: subject, 
            text: `${message}: ${otp}`, 
            html: `<b>${message}: ${otp}</b>`, 
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}


const securePassword=async(password)=>{
    try{
        const passwordHash= await bcrypt.hash(password,10)
        return passwordHash
    }
    catch(error){
        console.error(error)
    }
}


module.exports = { generateOtp, sendVerificationEmail,securePassword };
