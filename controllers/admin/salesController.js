const Order=require('../../models/orderSchema');
const Book = require("../../models/bookSchema");
const User=require('../../models/userSchema');
const moment = require('moment'); 
const ExcelJS=require('exceljs');
const PDFDocument = require('pdfkit');

require('pdfkit-table');

const { getSalesReport } = require('../../helpers/saleHelper');




const loadSaleReport = async (req, res) => {
        try {
          const { filterType, fromDate, toDate } = req.query;
      
          const { result, dateRange } = await getSalesReport({ filterType, fromDate, toDate });  //performing aggregation according to the query
      
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
    const { result, computedFrom, computedTo } = await getSalesReport({ filterType, fromDate, toDate });

    const metrics = result.totalMetrics[0] || {};
    const bestBooks = result.bestSellingBooks || [];
    const orderlist = result.orderDetails || [];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.getRow(1).font = { bold: true };

    const formattedFromDate = computedFrom ? moment(computedFrom).format("DD MMM YYYY") : "N/A";
    const formattedToDate = computedTo ? moment(computedTo).format("DD MMM YYYY") : "N/A";

    //overall summary
    const summaryText = 
      `Date Range - ${formattedFromDate} to ${formattedToDate}, ` +
      `Filter Type - ${filterType || 'All'}, ` +
      `Total Orders - ${metrics.totalOrders || 0}, ` +
      `Total Amount - ${metrics.totalAmount || 0}, ` +
      `Net Sales - ${metrics.netSales.toFixed(2) || 0}, ` +
      `Total Discount - ${metrics.totalOrderDiscount.toFixed(2) || 0}, ` +
      `Coupons Used - ${metrics.totalCouponUsed || 0}`;

    const summaryRow = worksheet.addRow([summaryText]);
    worksheet.mergeCells('A2:J2');  // merge required columns to display the overall data
    
    
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    worksheet.getCell('A2').font = { bold: true };
    
    // empty space for neat
    worksheet.addRow([]);
    
    
    worksheet.addRow(['Order Details']).font = { bold: true };
    worksheet.addRow([]);
    worksheet.addRow([
      'S.No',
      'User Email',
      'User Name',
      'Amount Paid',
      'Discount Given',
      'Status',
    ]).font = { bold: true };
    
    
    orderlist.forEach((order,index) => {
      worksheet.addRow([
        index + 1, 
        order.email || 'N/A',
        order.username || 'N/A',
        (order.netAmount || 0).toFixed(2),
        (order.discount || 0).toFixed(2),
        order.status || 'N/A'
      ]);
    });
    
    // adjusting column width 
    worksheet.columns.forEach((column, index) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        //skipping the cell inwhich overall data displayed
        if (cell.row === 2) return;
        
        const cellValue = cell.value ? cell.value.toString() : '';
        if (cellValue.length > maxLength) {
          maxLength = cellValue.length;
        }
    
  });
  column.width = maxLength + 5;
        
    });

    const filename = `sales-report-${moment().format("YYYY-MM-DD")}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error in saleReportExcel:", error);
    res.status(500).send("Failed to download Excel");
  }
};



const saleReportPDF = async (req, res) => {
  try {
    const { filterType, fromDate, toDate } = req.query;
    const { result, computedFrom, computedTo } = await getSalesReport({ filterType, fromDate, toDate });

    const metrics = result.totalMetrics[0] || {};
    const orderlist = result.orderDetails || [];

    const formattedFromDate = computedFrom ? moment(computedFrom).format("DD MMM YYYY") : "N/A";
    const formattedToDate = computedTo ? moment(computedTo).format("DD MMM YYYY") : "N/A";

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    doc.pipe(res);

    // overall data
    doc.fontSize(16).font('Helvetica-Bold').text(
      `Date Range - ${formattedFromDate} to ${formattedToDate}, Filter Type - ${filterType || 'All'}, Total Orders - ${metrics.totalOrders || 0}, Total Amount - ${metrics.totalAmount.toFixed(2) || 0}, Net Sales - ${metrics.netSales.toFixed(2) || 0}`,
      { align: 'center' }
    );
    doc.moveDown(2);

  //drawing table
    const tableHeaders = ['S.No','User Email', 'User Name', 'Amount Paid', 'Discount Given', 'Status'];
    const tableData = orderlist.map((order,index) => [
      (index + 1).toString(),  
      order.email || 'N/A',
      order.username || 'N/A',
      (order.netAmount || 0).toFixed(2),
      (order.discount || 0).toFixed(2),
      order.status || 'N/A'
    ]);

    // table dimentions and postion
    const startX = 30;
    let startY = doc.y + 10; 
    const rowHeight = 20;
    const columnWidths = [40,150, 120, 80, 80, 80];


    doc.fontSize(10).font('Helvetica-Bold');
    tableHeaders.forEach((header, i) => {
      doc.text(header, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), startY, { width: columnWidths[i], align: 'center' });
    });

    
    doc.fontSize(10).font('Helvetica');
    tableData.forEach((row, rowIndex) => {
      startY += rowHeight;
      row.forEach((cell, colIndex) => {
        doc.text(cell, startX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), startY, { width: columnWidths[colIndex], align: 'center' });
      });
    });

    doc.end();
  } catch (error) {
    console.error("Error in saleReportPDF:", error);
    res.status(500).send("Failed to download PDF");
  }
};


module.exports={loadSaleReport,saleReportExcel,saleReportPDF}

