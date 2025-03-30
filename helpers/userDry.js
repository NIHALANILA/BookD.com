const User=require('../models/userSchema')



const checkUserSession = async (req) => {
    if (!req.session.user) {
        return null;
    }

    const user = await User.findOne({ username: req.session.user.username });

    if (!user||user.status === 'blocked') {
        
        delete req.session.user;
        return null;
    }

    

    return user;
};

module.exports = {checkUserSession}
