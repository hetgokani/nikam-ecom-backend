const Variant = require("../models/Variant");
const XLSX = require("xlsx");

// controllers/stockController.js

exports.getAllStock = async (req, res) => {
  try {
    // UPDATED: Added 'thumbnail' to populate so images show in the table!
    const variants = await Variant.find().populate(
      "productId",
      "title thumbnail"
    );
    res.status(200).json(variants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ... keep the rest of your export/import functions exactly the same

exports.exportStockToExcel = async (req, res) => {
  try {
    const variants = await Variant.find().populate("productId", "title");
    const data = variants.map((v) => ({
      Variant_ID: v._id.toString(),
      Product_Name: v.productId ? v.productId.title : "N/A",
      SKU: v.sku,
      Current_Stock: v.stock,
      New_Stock: v.stock,
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Stock_Update.xlsx"
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.importStockFromExcel = async (req, res) => {
  try {
    const workbook = XLSX.read(req.files[0].buffer, { type: "buffer" });
    const sheetData = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]]
    );
    const updates = sheetData.map((row) => {
      if (row.Variant_ID)
        return Variant.findByIdAndUpdate(row.Variant_ID, {
          stock: Number(row.New_Stock),
        });
    });
    await Promise.all(updates);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
