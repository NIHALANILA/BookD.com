const Order=require('../../models/orderSchema');
const Book = require("../../models/bookSchema");
const User=require('../../models/userSchema');
const moment = require('moment'); 
const ExcelJS=require('exceljs');
const PDFDocument = require('pdfkit');
const { getSalesReport } = require('../../helpers/saleHelper');



const loadSaleReport = async (req, res) => {
        try {
          const { filterType, fromDate, toDate } = req.query;
      
          const { result, dateRange } = await getSalesReport({ filterType, fromDate, toDate });
      
          res.render('saleReport', {
            from: dateRange?.$gte || null,
            to: dateRange?.$lte || null,
            filterType: filterType || "all",
            result,
            moment
          });
      
        } catch (error) {
          console.error("Error in saleReport:", error);
          res.status(500).json({ error: "Something went wrong" });
        }
}




const saleReportExcel = async (req, res) => {
  try {
    const { filterType, fromDate, toDate } = req.query;
    const { result,computedFrom, computedTo } = await getSalesReport({ filterType, fromDate, toDate });

    const metrics = result.totalMetrics[0] || {};
    const bestBooks = result.bestSellingBooks || [];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    
    worksheet.addRow(['Metric', 'Value', '','Best-Selling Book', 'Quantity','Discount']);

    const formattedFromDate = computedFrom ? moment(computedFrom).format("DD MMM YYYY") : "N/A";
    const formattedToDate = computedTo ? moment(computedTo).format("DD MMM YYYY") : "N/A";

    
    worksheet.addRow(['Date Range', `${formattedFromDate || 'N/A'} - ${formattedToDate || 'N/A'}`]);
    worksheet.addRow(['Filter Type', filterType]);
    worksheet.addRow(['Total Orders', metrics.totalOrders || 0]);
    worksheet.addRow(['Total Amount', metrics.totalAmount || 0]);
    worksheet.addRow(['Net Sales', metrics.netSales || 0]);
    worksheet.addRow(['Total Discount', metrics.totalOrderDiscount || 0]);
    worksheet.addRow(['Coupons Used', metrics.totalCouponUsed || 0]);

    // leave a rowspace
    worksheet.addRow([]);

    
    bestBooks.forEach((book) => {
      worksheet.addRow([
        '', '','',
        `${book.bookName}`,
        ` ${book.totalQuantitySold}`, `${book.totalOfferdiscount}`
      ]);
    });

    
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const colLength = cell.value ? cell.value.toString().length : 10;
        if (colLength > maxLength) {
          maxLength = colLength;
        }
      });
      column.width = maxLength + 5;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to download Excel");
  }
};

const saleReportPDF = async (req, res) => {
  try {
    const { filterType, fromDate, toDate } = req.query;
    const { result, computedFrom, computedTo } = await getSalesReport({ filterType, fromDate, toDate });

    const metrics = result.totalMetrics[0] || {};
    const bestBooks = result.bestSellingBooks || [];

    const formattedFromDate = computedFrom ? moment(computedFrom).format("DD MMM YYYY") : "N/A";
    const formattedToDate = computedTo ? moment(computedTo).format("DD MMM YYYY") : "N/A";

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Sales Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Date Range: ${formattedFromDate} - ${formattedToDate}`);
    doc.text(`Filter Type: ${filterType}`);
    doc.text(`Total Orders: ${metrics.totalOrders || 0}`);
    doc.text(`Total Amount: ₹${metrics.totalAmount || 0}`);
    doc.text(`Net Sales: ₹${metrics.netSales || 0}`);
    doc.text(`Total Discount: ₹${metrics.totalOrderDiscount || 0}`);
    doc.text(`Coupons Used: ${metrics.totalCouponUsed || 0}`);
    doc.moveDown();

    doc.fontSize(14).text('Best-Selling Books', { underline: true });
    doc.moveDown(0.5);

    if (bestBooks.length === 0) {
      doc.text('No bestselling books data available.');
    } else {
      bestBooks.forEach((book, index) => {
        doc.text(`${index + 1}. ${book.bookName}`);
        doc.text(`   Quantity Sold: ${book.totalQuantitySold}`);
        doc.text(`   Total Discount: ₹${book.totalOfferdiscount}`);
        doc.moveDown(0.5);
      });
    }

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to download PDF");
  }
};

module.exports={loadSaleReport,saleReportExcel,saleReportPDF}

