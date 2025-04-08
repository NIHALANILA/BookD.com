const mongoose = require('mongoose');
const {Schema}=mongoose;

const walletSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
      },
      balance: {
        type: Number,
        default: 0
      },
      transactions: [
        {
          type: {
            type: String,
            enum: ['credit', 'debit'], // Helps categorize the transaction
            required: true
          },
          amount: {
            type: Number,
            required: true
          },
          date: {
            type: Date,
            default: Date.now
          },
          note: {
            type: String,
            default: ''
          }
        }
      ]
},
 { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports=Wallet