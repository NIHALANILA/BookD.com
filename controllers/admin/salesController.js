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
          const { filterType, fromDate, toDate ,page = 1, limit = 10  } = req.query;
      
          const { result, dateRange } = await getSalesReport({ filterType, fromDate, toDate, isDownload: false });  //performing aggregation according to the query
      
          res.render('saleReport', {
            from: dateRange?.$gte || null,
            to: dateRange?.$lte || null,
            filterType: filterType || "all",
            result,
            currentPage: parseInt(page),
            totalPages: Math.ceil(result.totalCount / limit),
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
    const { result, computedFrom, computedTo } = await getSalesReport({ filterType, fromDate, toDate, isDownload: true });

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
      `Filter Type - ${filterType || 'All'}, ` ;
     
      

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
      'Order Id',
      'Date',
      'Amount',
      'Discount Given',
      'Payment Method',
    ]).font = { bold: true };
    
    
    orderlist.forEach((order,index) => {
      worksheet.addRow([
        index + 1, 
        order.orderId || 'N/A',
        moment(order.createdAt).format('MMM DD YYYY') || 'N/A',
        (order.total || 0).toFixed(2),
        (order.discount || 0).toFixed(2),
        order.paymentMethod || 'N/A'
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

    // Add summary at the bottom
worksheet.addRow([]);
worksheet.addRow(['Summary']).font = { bold: true };
worksheet.addRow([]);

worksheet.addRow(['Total Orders',Number(metrics.totalOrders || 0) ]);
worksheet.addRow(['Coupons Used',Number(metrics.totalCouponUsed || 0) ]);
worksheet.addRow(['Total Amount', Number(metrics.totalAmount || 0)]);
worksheet.addRow(['Total Discount', Number(metrics.totalOrderDiscount || 0)]);




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
    const { result, computedFrom, computedTo } = await getSalesReport({ filterType, fromDate, toDate, isDownload: true });

    const metrics = result.totalMetrics[0] || {};
    const orderlist = result.orderDetails || [];

    const formattedFromDate = computedFrom ? moment(computedFrom).format("DD MMM YYYY") : "N/A";
    const formattedToDate = computedTo ? moment(computedTo).format("DD MMM YYYY") : "N/A";

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
    doc.pipe(res);

    // overall data
    // Title only (Date Range & Filter Type)
doc.fontSize(16).font('Helvetica-Bold').text("Sales Report", { align: 'center' });
doc.moveDown(1);

doc.fontSize(12).font('Helvetica').text(`Date Range: ${formattedFromDate} to ${formattedToDate}`, { align: 'center' });
doc.text(`Filter Type: ${filterType || 'All'}`, { align: 'center' });
doc.moveDown(2);

    doc.moveDown(2);

  //drawing table
    const tableHeaders = ['S.No','Order Id', 'Date', 'Amount', 'Discount Given', 'Payment Method'];
    const tableData = orderlist.map((order,index) => [
      (index + 1).toString(),  
      order.orderId || 'N/A',
       moment(order.createdAt).format('MMM DD YYYY') || 'N/A',
      (order.total || 0).toFixed(2),
      (order.discount || 0).toFixed(2),
      order.paymentMethod || 'N/A'
    ]);

    // table dimentions and postion
    const startX = 30;
    let startY = doc.y + 10; 
    const rowHeight = 20;
    const columnWidths = [40,150, 120, 80, 80, 80];
    const pageHeightLimit = doc.page.height - 50;

    // Helper to draw table headers
function drawTableHeaders(y) {
  doc.fontSize(10).font('Helvetica');
  tableHeaders.forEach((header, i) => {
    const x = startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(header, x, y, { width: columnWidths[i], align: 'center' });
  });
}

drawTableHeaders(startY);
doc.fontSize(10).font('Helvetica');

// Draw rows
tableData.forEach((row, rowIndex) => {
  startY += rowHeight;

  // Add a new page if the current Y position is too low
  if (startY > pageHeightLimit) {
    doc.addPage();
    startY = 50; // Reset Y position after new page
    drawTableHeaders(startY);
    startY += rowHeight;
  }

  // Draw each cell
  row.forEach((cell, colIndex) => {
    const x = startX + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0);
    doc.text(cell, x, startY, { width: columnWidths[colIndex], align: 'center' });
  });
});

// Add spacing before summary
// Add spacing before summary
startY += 30;
if (startY > pageHeightLimit) {
  doc.addPage();
  startY = 50;
}

// Get page width and center alignment
const pageWidth = doc.page.width;
const contentWidth = 300; // Width block for summary
const summaryX = (pageWidth - contentWidth) / 2; // Center X position

// Summary Section
doc.moveDown(2);
doc.fontSize(12).font('Helvetica-Bold').text("Summary", summaryX, startY, {
  width: contentWidth,
  align: 'center',
  underline: true,
});
startY = doc.y + 10;

doc.fontSize(12).font('Helvetica').text(`Total Orders: ${metrics.totalOrders || 0}`, summaryX, startY, {
  width: contentWidth,
  align: 'center',
});
startY = doc.y + 5;

doc.text(`Total Amount: ${Number(metrics.totalAmount || 0)}`, summaryX, startY, {
  width: contentWidth,
  align: 'center',
});
startY = doc.y + 5;

doc.text(`Total Discount: ${Number(metrics.totalOrderDiscount || 0)}`, summaryX, startY, {
  width: contentWidth,
  align: 'center',
});
startY = doc.y + 5;



    doc.end();
  } catch (error) {
    console.error("Error in saleReportPDF:", error);
    res.status(500).send("Failed to download PDF");
  }
};


module.exports={loadSaleReport,saleReportExcel,saleReportPDF}

