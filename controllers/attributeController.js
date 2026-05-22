const Attribute = require("../models/Attribute");

exports.createAttribute = async (req, res) => {
  try {
    const { name, type } = req.body;

    // Convert to strict boolean (handles string "true" from FormData or actual boolean true)
    const displayAsDropdown =
      req.body.displayAsDropdown === "true" ||
      req.body.displayAsDropdown === true;

    // Parse the terms sent from the frontend
    const parsedTerms = req.body.terms ? JSON.parse(req.body.terms) : [];

    // Strip empty _ids from new rows to prevent CastError
    parsedTerms.forEach((term) => {
      if (!term._id || term._id === "") {
        delete term._id;
      }
    });

    // If type is "image", match the uploaded files to the correct term
    if (type === "image" && req.files) {
      parsedTerms.forEach((term, index) => {
        const file = req.files.find(
          (f) => f.fieldname === `termImage_${index}`,
        );
        if (file) {
          term.image = `/uploads/${file.filename}`;
        }
      });
    }

    const attr = await Attribute.create({
      name,
      type,
      displayAsDropdown, // NEW FIELD SAVED HERE
      terms: parsedTerms,
    });

    res.status(201).json(attr);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateAttribute = async (req, res) => {
  try {
    const { name, type } = req.body;

    // Convert to strict boolean
    const displayAsDropdown =
      req.body.displayAsDropdown === "true" ||
      req.body.displayAsDropdown === true;

    const parsedTerms = req.body.terms ? JSON.parse(req.body.terms) : [];

    // Strip empty _ids from new rows to prevent CastError
    parsedTerms.forEach((term) => {
      if (!term._id || term._id === "") {
        delete term._id;
      }
    });

    if (type === "image" && req.files) {
      parsedTerms.forEach((term, index) => {
        const file = req.files.find(
          (f) => f.fieldname === `termImage_${index}`,
        );
        if (file) {
          term.image = `/uploads/${file.filename}`;
        }
      });
    }

    const attr = await Attribute.findByIdAndUpdate(
      req.params.id,
      {
        name,
        type,
        displayAsDropdown, // NEW FIELD SAVED HERE
        terms: parsedTerms,
      },
      { returnDocument: "after" },
    );

    if (!attr) {
      return res.status(404).json({ error: "Attribute not found" });
    }

    res.status(200).json(attr);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAttributes = async (req, res) => {
  try {
    const attrs = await Attribute.find();
    res.status(200).json(attrs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAttribute = async (req, res) => {
  try {
    await Attribute.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Attribute Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
