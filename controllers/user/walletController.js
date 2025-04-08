const Wallet = require('../../models/walletSchema');
const {checkUserSession} = require('../../helpers/userDry')

const getWalletPage = async (req, res) => {
    const user = await checkUserSession(req);
    console.log("Session userId:", req.session.userId);
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
};


module.exports={getWalletPage}