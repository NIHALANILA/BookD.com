const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const {checkUserSession} = require('../../helpers/userDry')



const loadAddressPage = async (req, res) => {
    try {
        const user = await checkUserSession(req); 
        if (!user) {
            return res.redirect('/login'); 
        }

        //  Store where the user came from 
        if (req.query.from === 'checkout') {
            req.session.returnToCheckout = true;
        }

        const searchQuery = req.query.search || ""; 
        const addresses = await Address.find({ userId: user._id });

        res.render('address', {
            user,
            addresses,
            searchQuery,
            session: req.session
        });
    } catch (error) {
        console.error("Error loading addresses:", error);
        res.status(500).send("Failed to load addresses.");
    }
};

const addNewaddress = async (req, res) => {
    try {
        const user = await checkUserSession(req);
        if (!user) {
            return res.redirect('/');
        }

        const userId = req.session.user._id;
        const addressCount = await Address.countDocuments({ userId: userId });

        if (addressCount >= 3) {
            req.session.message = "You can only add up to 3 addresses.";
            return res.redirect('/profile/address');
        }

        const newAddress = new Address({
            userId: userId,
            name: req.body.name,
            phone: req.body.phone,
            city: req.body.city,
            state: req.body.state,
            place: req.body.place,
            pincode: req.body.pincode,
            address: req.body.address
        });

        await newAddress.save();

        //  Redirect to /checkout if the user came from there
        if (req.session.returnToCheckout) {
            req.session.returnToCheckout = null; // clear it
            return res.redirect('/checkout');
        }

        
        res.redirect('/profile/address');
    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).send("Failed to add address.");
    }
};


const loadeditaddress=async(req,res)=>{
    try {
        const { search } = req.query;
        const userData = await checkUserSession(req)
        const user = await User.findById(userData);
        const addressdata=await Address.findOne({userId:user._id})
        //storing from where req comes
        const from=req.query.from;
        req.session.returnToCheckout = (from === 'checkout');
        const userProfile={
            _id:user._id,
            email:user.email,
            phone:user.phone,
            city:addressdata?.city||"",
            name:addressdata?.name||"",
            state:addressdata?.state||"",
            place:addressdata?.place||"",
            pincode:addressdata?.pincode||"",
            address:addressdata?.address||""

        }
        res.render('editAddress',{user:userProfile||{},searchQuery: search || "",message:null})
    } catch (error) {
        console.log(error)
    }
}

const editaddress = async (req, res) => {
    try {
        const user = await checkUserSession(req);
        if (!user) return res.redirect("/");

        const userId = req.session.user._id;
        const { fullName, phone, city, state, place, pincode, address } = req.body;

        if (!fullName || !phone || !city || !state || !place || !pincode || !address) {
            return res.json({ success: false, message: "Missing required fields." });
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        const pinRegex = /^\d{6}$/;

        if (!phoneRegex.test(phone) || !pinRegex.test(pincode)) {
            return res.json({ success: false, message: "Invalid phone or pincode." });
        }

        
        const updatedAddress = await Address.findOneAndUpdate(
            { userId },
            {
                name: fullName,
                phone,
                city,
                state,
                place,
                pincode,
                address
            },
            { new: true, upsert: true } 
        );
       
        if (req.session.returnToCheckout) {
         return res.json({ redirectTo:'/checkout' , data: updatedAddress });
        }
        return res.json({ redirectTo: '/profile/address',data: updatedAddress });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};




const deleteAddress=async(req,res)=>{
     
    const addressId = req.params.id;

    try {
        const user= await checkUserSession(req)
        if(!user){
            return res.redirect('/')
        }

        await Address.findByIdAndDelete(addressId);
        return res.json({ success: true, message: "Username updated successfully" });
       // res.status(200).send("Address deleted");
        
    } catch (error) {
        res.status(500).send("Error deleting address");
        
    }
}
module.exports={loadAddressPage,addNewaddress,editaddress,loadeditaddress,deleteAddress}