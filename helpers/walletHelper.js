const Wallet = require("../models/walletSchema");

const refundToWallet = async (userId, amount) => {
  let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
      wallet = new Wallet({
          userId,
          balance: amount,
          transactions: [{
              type: 'credit',
              amount: amount,
              date: new Date(),
              note: 'Refund for returned order'
          }]
      });
  } else {
      wallet.balance += amount;

      wallet.transactions.push({
          type: 'credit',
          amount: amount,
          date: new Date(),
          note: 'Refund for returned order'
      });
  }

  await wallet.save();
};

module.exports = { refundToWallet };
