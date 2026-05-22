const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    add: { type: Boolean, default: false },
    view: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    rolename: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    permissions: {
      role: { type: permissionSchema, default: () => ({}) },
      contact: { type: permissionSchema, default: () => ({}) },
      faq: { type: permissionSchema, default: () => ({}) },
      banner: { type: permissionSchema, default: () => ({}) },
      category: { type: permissionSchema, default: () => ({}) },
      products: { type: permissionSchema, default: () => ({}) },
      order: { type: permissionSchema, default: () => ({}) },
      feedback: { type: permissionSchema, default: () => ({}) },
      coupon: { type: permissionSchema, default: () => ({}) },
      invoice: { type: permissionSchema, default: () => ({}) },
      stock: { type: permissionSchema, default: () => ({}) },
      gst: { type: permissionSchema, default: () => ({}) },
      tags: { type: permissionSchema, default: () => ({}) },
      reviews: { type: permissionSchema, default: () => ({}) },
      coupon: { type: permissionSchema, default: () => ({}) },
      ship: { type: permissionSchema, default: () => ({}) },
      ticket: { type: permissionSchema, default: () => ({}) },
      invoice: { type: permissionSchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("role", roleSchema);
