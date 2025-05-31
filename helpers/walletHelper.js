const Wallet = require("../models/walletSchema");

const refundToWallet = async (userId, amount,message) => {
    try {

        let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
      wallet = new Wallet({
          userId,
          balance: amount,
          transactions: [{
              type: 'credit',
              amount: amount,
              date: new Date(),
              note: message
          }]
      });
  } else {
      wallet.balance += amount;

      wallet.transactions.push({
          type: 'credit',
          amount: amount,
          date: new Date(),
          note: message
      });
  }

  await wallet.save();
        
    } catch (error) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${error.message}`);
        

        
    }
  
};

module.exports = { refundToWallet };
