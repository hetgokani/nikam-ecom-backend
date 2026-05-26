const Shipping = require("../models/Shipping");
const xlsx = require("xlsx");

// @desc    Get All Shipping Methods
exports.getAllShipping = async (req, res) => {
  try {
    const methods = await Shipping.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: methods.length, methods });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add or Update Shipping (Manual Entry)
exports.upsertShipping = async (req, res) => {
  try {
    const { city, shippingPrice, deliveryDuration, isAvailable } = req.body;

    // REMOVED: pincode field from criteria and updates
    const shipping = await Shipping.findOneAndUpdate(
      { city },
      { shippingPrice, deliveryDuration, isAvailable },
      { new: true, upsert: true }
    );
    res
      .status(200)
      .json({ success: true, shipping, message: "Shipping rule saved!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Shipping Entry
exports.deleteShipping = async (req, res) => {
  try {
    const shipping = await Shipping.findById(req.params.id);
    if (!shipping)
      return res.status(404).json({ message: "Shipping rule not found" });

    await shipping.deleteOne();
    res.status(200).json({ success: true, message: "Shipping rule deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import from Excel/CSV
exports.importShipping = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ message: "Please upload an Excel or CSV file" });

    // Read the file from buffer
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      return res.status(400).json({ message: "The uploaded file is empty" });
    }

    // REMOVED: PIN Code mapping from the sheet object payload
    const bulkOps = data.map((item) => ({
      updateOne: {
        filter: { city: item["City Name"] || "Unknown" },
        update: {
          shippingPrice: Number(item["Shipping Price (₹)"]) || 0,
          deliveryDuration: item["Delivery Duration"] || "3-5 Days",
          isAvailable: item["Available"] !== "No", // Defaults to true unless explicitly "No"
        },
        upsert: true,
      },
    }));

    await Shipping.bulkWrite(bulkOps);
    res.status(200).json({
      success: true,
      message: `${data.length} shipping rules imported successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export to Excel
exports.exportShipping = async (req, res) => {
  try {
    const data = await Shipping.find().sort({ city: 1 });

    // REMOVED: "PIN Code" key allocation from formatting layout
    const formattedData = data.map((s) => ({
      "City Name": s.city,
      "Shipping Price (₹)": s.shippingPrice,
      "Delivery Duration": s.deliveryDuration,
      Available: s.isAvailable ? "Yes" : "No",
    }));

    const worksheet = xlsx.utils.json_to_sheet(formattedData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Shipping Rules");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=shipping_rates.xlsx"
    );
    res.type(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
