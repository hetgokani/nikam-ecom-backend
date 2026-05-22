const GST = require("../models/gstModel");
const Setting = require("../models/Setting");

exports.getUniversalTax = async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: "tax_rule" });
    if (!setting) {
      setting = await Setting.create({ key: "tax_rule", value: "Exclusive" });
    }
    res.status(200).json({ value: setting.value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUniversalTax = async (req, res) => {
  try {
    const { value } = req.body;
    const setting = await Setting.findOneAndUpdate(
      { key: "tax_rule" },
      { value },
      { new: true, upsert: true }
    );
    res.status(200).json({ message: "Global tax rule updated", data: setting });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addGstRate = async (req, res) => {
  try {
    const { taxType, rate } = req.body;
    if (!taxType || rate === undefined) {
      return res
        .status(400)
        .json({ message: "Tax type and rate are required" });
    }
    const existingGst = await GST.findOne({ taxType, rate });
    if (existingGst) {
      return res
        .status(400)
        .json({ message: `${taxType} at ${rate}% already exists.` });
    }
    const newGst = new GST({ taxType, rate });
    await newGst.save();
    res
      .status(201)
      .json({ message: "GST rate added successfully", data: newGst });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getGstRates = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type ? { taxType: type } : {};
    const gstRates = await GST.find(filter).sort({ rate: 1 });
    res.status(200).json({ data: gstRates });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateGstRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { taxType, rate } = req.body;
    const updatedGst = await GST.findByIdAndUpdate(
      id,
      { taxType, rate },
      { new: true }
    );
    if (!updatedGst)
      return res.status(404).json({ message: "GST rate not found" });
    res.status(200).json({ message: "GST rate updated", data: updatedGst });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteGstRate = async (req, res) => {
  try {
    const { id } = req.params;
    await GST.findByIdAndDelete(id);
    res.status(200).json({ message: "GST rate deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
