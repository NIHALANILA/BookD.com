const Order=require('../../models/orderSchema');
const moment = require('moment'); 
const {dashBoard}=require('../../helpers/dashBoardHelper')


const loadDashBoard= async(req,res)=>{
    try {
        if(req.session.admin){
            const { filterType, fromDate, toDate } = req.query;
        const { result, dateRange } = await dashBoard({ filterType, fromDate, toDate })

        res.render('dashboard', {
            from: dateRange?.$gte || null,
            to: dateRange?.$lte || null,
            filterType: filterType || "all",
            result,
            moment
          });

          

        }
        else{
            res.redirect('/admin/login')
        }

        
    } catch (error) {
        
    }
}