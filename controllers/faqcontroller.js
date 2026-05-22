const Faq = require("../models/faq");

exports.addFaq = async (req, res) => {
  try {
    const newFaq = new Faq(req.body);
    await newFaq.save();
    res.status(201).json({ message: "FAQ Added Successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllFaqs = async (req, res) => {
  try {
    // Only fetch active ones for frontend if needed, but here we fetch all for Admin
    const faqs = await Faq.find().sort({ order: 1 });
    res.status(200).json(faqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    await Faq.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({ message: "FAQ Updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    await Faq.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "FAQ Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
