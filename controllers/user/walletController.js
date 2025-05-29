const Wallet = require('../../models/walletSchema');
const {checkUserSession} = require('../../helpers/userDry')

const getWalletPage = async (req, res) => {
    try {
        const user = await checkUserSession(req);
    
    const wallet = await Wallet.findOne({ userId:user._id });

    if (!wallet) {
        return res.render('wallet', {
            wallet: {
                balance: 0,
                transactions: []
            }
        });
    }

    res.render('wallet', { wallet });
        
    } catch (error) {
        console.error('error in getWalletPage',error.message)
        res.redirect('/pageNotfound')
    }
    
};


module.exports={getWalletPage}