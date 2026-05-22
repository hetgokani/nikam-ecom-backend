const Role = require("../models/role");

// CREATE ROLE
exports.createrole = async (req, res) => {
  try {
    const { rolename, permissions } = req.body;

    if (!rolename) {
      return res.status(400).json({ message: "Role name required" });
    }

    const exists = await Role.findOne({
      rolename: rolename.toLowerCase(),
    });

    if (exists) {
      return res.status(400).json({ message: "Role already exists" });
    }

    const role = await Role.create({
      rolename: rolename.toLowerCase(),
      permissions,
    });

    res.status(201).json({
      message: "Role created successfully",
      role,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ALL ROLES
exports.getallroles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.status(200).json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// EDIT ROLE
exports.editrole = async (req, res) => {
  try {
    const { id } = req.params;
    const { rolename, permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (rolename) role.rolename = rolename.toLowerCase();
    if (permissions) role.permissions = permissions;

    await role.save();

    res.status(200).json({ message: "Role updated successfully", role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE ROLE
exports.deleterole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    await role.deleteOne();

    res.status(200).json({ message: "Role deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
