const express = require("express");
const router = express.Router();

const {
  createrole,
  getallroles,
  editrole,
  deleterole,
} = require("../controllers/rolecontroller"); // ✅ added new imports

router.post("/createrole", createrole);
router.get("/getallroles", getallroles);

// New APIs
router.put("/editrole/:id", editrole); // Edit role by ID
router.delete("/deleterole/:id", deleterole); // Delete role by ID

module.exports = router;
