const Product = require("../models/Product");
const Variant = require("../models/Variant");
const Setting = require("../models/Setting"); // <-- IMPORTANT
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

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
        if (file.fieldname === "thumbnail")
          thumbnailPath = `/uploads/product/${file.filename}`;
        if (file.fieldname === "gallery")
          galleryPaths.push(`/uploads/product/${file.filename}`);
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
          if (file.fieldname.startsWith(`image_${vIdx}_`))
            variantImages.push(`/uploads/product/${file.filename}`);
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

// ---------------------------------------------------------
// GET ALL PRODUCTS WITH UNIVERSAL GST LOGIC
// ---------------------------------------------------------
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("brand")
      .populate("category")
      .populate("productAttributes.attribute")
      .populate("variants");

    const taxSetting = await Setting.findOne({ key: "tax_rule" });
    const isUniversalInclusive = taxSetting
      ? taxSetting.value === "Inclusive"
      : false;

    const formattedProducts = products.map((product) => {
      const prodObj = JSON.parse(JSON.stringify(product));

      if (prodObj.variants && prodObj.variants.length > 0) {
        prodObj.variants.forEach((v) => {
          if (isUniversalInclusive) {
            const totalTax = (Number(v.sgst) || 0) + (Number(v.cgst) || 0);
            if (totalTax > 0) {
              const multiplier = 1 + totalTax / 100;
              v.basePriceWithoutTax = v.price;
              v.price = Math.round(v.price * multiplier);

              if (v.discountPrice) {
                v.baseDiscountWithoutTax = v.discountPrice;
                v.discountPrice = Math.round(v.discountPrice * multiplier);
              }
            }
          }
        });
      }
      return prodObj;
    });

    res.status(200).json(formattedProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------------------------------------
// GET SINGLE PRODUCT WITH UNIVERSAL GST LOGIC
// ---------------------------------------------------------
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("brand")
      .populate("category")
      .populate("productAttributes.attribute")
      .populate("variants");

    if (!product) return res.status(404).json({ message: "Product not found" });

    const taxSetting = await Setting.findOne({ key: "tax_rule" });
    const isUniversalInclusive = taxSetting
      ? taxSetting.value === "Inclusive"
      : false;

    const prodObj = JSON.parse(JSON.stringify(product));

    if (prodObj.variants && prodObj.variants.length > 0) {
      prodObj.variants.forEach((v) => {
        if (isUniversalInclusive) {
          const totalTax = (Number(v.sgst) || 0) + (Number(v.cgst) || 0);
          if (totalTax > 0) {
            const multiplier = 1 + totalTax / 100;
            v.basePriceWithoutTax = v.price;
            v.price = Math.round(v.price * multiplier);

            if (v.discountPrice) {
              v.baseDiscountWithoutTax = v.discountPrice;
              v.discountPrice = Math.round(v.discountPrice * multiplier);
            }
          }
        }
      });
    }

    res.status(200).json({ product: prodObj, variants: prodObj.variants });
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
        if (file.fieldname === "thumbnail")
          updateData.thumbnail = `/uploads/product/${file.filename}`;
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (req.body.variants) {
      const parsedVariants = JSON.parse(req.body.variants);
      await Variant.deleteMany({ productId: req.params.id });

      const finalVariants = parsedVariants.map((v, vIdx) => {
        const variantImages = v.existingImages || [];
        if (req.files) {
          req.files.forEach((file) => {
            if (file.fieldname.startsWith(`image_${vIdx}_`))
              variantImages.push(`/uploads/product/${file.filename}`);
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
      (img) => img && typeof img === "string" && img.trim() !== ""
    );
    imagesToDelete.forEach((imgPath) => {
      const fullPath = path.join(__dirname, "..", imgPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

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
      "attachment; filename=Products_Bulk_Update.xlsx"
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
    if (req.files[0].buffer)
      workbook = XLSX.read(req.files[0].buffer, { type: "buffer" });
    else if (req.files[0].path) workbook = XLSX.readFile(req.files[0].path);
    else return res.status(400).json({ error: "Invalid file format" });

    const sheetData = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
      { defval: 0 }
    );
    const updates = sheetData.map(async (row) => {
      const parsedDiscount = Number(
        row.Discount_Price || row["Discount Price"] || row.discountPrice || 0
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
    if (req.files[0].path && fs.existsSync(req.files[0].path))
      fs.unlinkSync(req.files[0].path);
    res.status(200).json({ success: true, message: "Bulk update complete!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
