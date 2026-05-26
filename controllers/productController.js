const Product = require("../models/Product");
const Variant = require("../models/Variant");
const Setting = require("../models/Setting");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const cloudinary = require("cloudinary").v2; // ADDED CLOUDINARY

exports.createProduct = async (req, res) => {
  try {
    const { title, description, brand, category, subcategory, vendor, status } =
      req.body;

    const parsedProductAttributes = req.body.productAttributes
      ? JSON.parse(req.body.productAttributes)
      : [];
    const parsedVariants = req.body.variants
      ? JSON.parse(req.body.variants)
      : [];

    let thumbnailPath = "";
    let galleryPaths = [];

    if (req.files) {
      req.files.forEach((file) => {
        // CLOUDINARY FIX: file.path contains the secure Cloudinary URL
        if (file.fieldname === "thumbnail") thumbnailPath = file.path;
        if (file.fieldname === "gallery") galleryPaths.push(file.path);
      });
    }

    const product = await Product.create({
      title,
      description,
      brand: brand || null,
      category: category || null,
      subcategory: subcategory || null,
      vendor,
      status,
      productAttributes: parsedProductAttributes,
      thumbnail: thumbnailPath,
      gallery: galleryPaths,
    });

    const finalVariants = parsedVariants.map((v, vIdx) => {
      const variantImages = [];
      if (req.files) {
        req.files.forEach((file) => {
          // CLOUDINARY FIX: file.path contains the secure Cloudinary URL
          if (file.fieldname.startsWith(`image_${vIdx}_`))
            variantImages.push(file.path);
        });
      }

      return {
        productId: product._id,
        title: v.title,
        sku: v.sku,
        attributes: v.attributes,
        price: Number(v.originalPrice) || 0,
        discountPrice: Number(v.discountPrice) || 0,
        stock: Number(v.stock) || 0,
        sgst: Number(v.sgst) || 0,
        cgst: Number(v.cgst) || 0,
        tag: v.tag || null,
        images: variantImages,
        isDefault: v.isDefault || false,
      };
    });

    if (finalVariants.length > 0) await Variant.insertMany(finalVariants);

    res.status(201).json({ success: true, product, variants: finalVariants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("brand")
      .populate("category")
      .populate("productAttributes.attribute")
      .populate("variants");

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("brand")
      .populate("category")
      .populate("productAttributes.attribute")
      .populate("variants");

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json({ product: product, variants: product.variants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    let updateData = { ...req.body };
    if (
      updateData.productAttributes &&
      typeof updateData.productAttributes === "string"
    ) {
      updateData.productAttributes = JSON.parse(updateData.productAttributes);
    }
    if (updateData.brand === "") updateData.brand = null;
    if (updateData.category === "") updateData.category = null;
    if (updateData.subcategory === "") updateData.subcategory = null;
    delete updateData.variants;

    if (req.files) {
      req.files.forEach((file) => {
        // CLOUDINARY FIX: Use file.path
        if (file.fieldname === "thumbnail") updateData.thumbnail = file.path;
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    if (req.body.variants) {
      const parsedVariants = JSON.parse(req.body.variants);
      await Variant.deleteMany({ productId: req.params.id });

      const finalVariants = parsedVariants.map((v, vIdx) => {
        const variantImages = v.existingImages || [];
        if (req.files) {
          req.files.forEach((file) => {
            // CLOUDINARY FIX: Use file.path
            if (file.fieldname.startsWith(`image_${vIdx}_`))
              variantImages.push(file.path);
          });
        }
        return {
          productId: updatedProduct._id,
          title: v.title,
          sku: v.sku,
          attributes: v.attributes,
          price: Number(v.originalPrice) || 0,
          discountPrice: Number(v.discountPrice) || 0,
          stock: Number(v.stock) || 0,
          sgst: Number(v.sgst) || 0,
          cgst: Number(v.cgst) || 0,
          tag: v.tag || null,
          images: variantImages,
          isDefault: v.isDefault || false,
        };
      });

      if (finalVariants.length > 0) await Variant.insertMany(finalVariants);
    }

    res.status(200).json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const variants = await Variant.find({ productId: req.params.id });
    if (!product) return res.status(404).json({ message: "Not found" });

    let imagesToDelete = [];
    if (product.thumbnail) imagesToDelete.push(product.thumbnail);
    if (product.gallery) imagesToDelete.push(...product.gallery);
    variants.forEach((v) => {
      if (v.images) imagesToDelete.push(...v.images);
    });

    imagesToDelete = imagesToDelete.filter(
      (img) => img && typeof img === "string" && img.trim() !== "",
    );

    // CLOUDINARY FIX: Delete from Cloudinary instead of local FS
    for (const imgUrl of imagesToDelete) {
      try {
        if (imgUrl.includes("cloudinary.com")) {
          // Extract public_id (folder/filename) from the URL
          const parts = imgUrl.split("/");
          const filename = parts.pop().split(".")[0];
          const folder = parts.pop();
          const public_id = `${folder}/${filename}`;
          await cloudinary.uploader.destroy(public_id);
        } else {
          // Fallback just in case you have old local images still in the DB
          const fullPath = path.join(__dirname, "..", imgUrl);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.error("Cloudinary deletion error:", err);
      }
    }

    await Variant.deleteMany({ productId: req.params.id });
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportProductsToExcel = async (req, res) => {
  try {
    const variants = await Variant.find()
      .populate({ path: "productId", populate: { path: "brand" } })
      .populate("tag");
    const data = variants.map((v) => ({
      Variant_ID: v._id.toString(),
      Product_ID: v.productId ? v.productId._id.toString() : "",
      Brand:
        v.productId && v.productId.brand
          ? v.productId.brand.name || v.productId.brand.title
          : "N/A",
      Product_Title: v.productId ? v.productId.title : "N/A",
      SKU: v.sku || "",
      Price: v.price || 0,
      Discount_Price: v.discountPrice || 0,
      Stock: v.stock || 0,
      SGST: v.sgst || 0,
      CGST: v.cgst || 0,
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bulk Products");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Products_Bulk_Update.xlsx",
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.importProductsFromExcel = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No file uploaded" });

    let workbook;

    // CLOUDINARY FIX: Read the Excel buffer securely from the Cloudinary URL
    if (req.files[0].path && req.files[0].path.includes("cloudinary.com")) {
      const response = await fetch(req.files[0].path);
      const arrayBuffer = await response.arrayBuffer();
      workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
    } else if (req.files[0].buffer) {
      workbook = XLSX.read(req.files[0].buffer, { type: "buffer" });
    } else if (req.files[0].path) {
      workbook = XLSX.readFile(req.files[0].path);
    } else {
      return res.status(400).json({ error: "Invalid file format" });
    }

    const sheetData = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
      { defval: 0 },
    );
    const updates = sheetData.map(async (row) => {
      const parsedDiscount = Number(
        row.Discount_Price || row["Discount Price"] || row.discountPrice || 0,
      );
      const parsedSGST = Number(row.SGST || row.sgst || 0);
      const parsedCGST = Number(row.CGST || row.cgst || 0);
      const parsedPrice = Number(row.Price || row.price || 0);
      const parsedStock = Number(row.Stock || row.stock || 0);

      if (row.Variant_ID) {
        await Variant.findByIdAndUpdate(row.Variant_ID, {
          sku: row.SKU || row.sku,
          price: parsedPrice,
          discountPrice: parsedDiscount,
          stock: parsedStock,
          sgst: parsedSGST,
          cgst: parsedCGST,
        });
      }
      if (row.Product_ID && row.Product_Title)
        await Product.findByIdAndUpdate(row.Product_ID, {
          title: row.Product_Title,
        });
    });

    await Promise.all(updates);

    // CLOUDINARY FIX: Delete the temporary excel file from Cloudinary after processing
    if (req.files[0].path && req.files[0].path.includes("cloudinary.com")) {
      const parts = req.files[0].path.split("/");
      const filename =
        parts.pop().split(".")[0] +
        "." +
        req.files[0].originalname.split(".").pop();
      const folder = parts.pop();
      await cloudinary.uploader.destroy(`${folder}/${filename}`, {
        resource_type: "raw",
      });
    } else if (req.files[0].path && fs.existsSync(req.files[0].path)) {
      fs.unlinkSync(req.files[0].path);
    }

    res.status(200).json({ success: true, message: "Bulk update complete!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
