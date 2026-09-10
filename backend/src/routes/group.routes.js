const express = require("express");
const groupController = require("../controllers/group.controller");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", authenticate, groupController.createGroup);

router.post(
    "/:groupId/members",
    authenticate,
    groupController.addMember
);

router.delete(
    "/:groupId/members/:userId",
    authenticate,
    groupController.removeMember
);

router.get(
    "/:groupId/members",
    authenticate,
    groupController.getMembers
);

router.put(
    "/:groupId/members/:userId/role",
    authenticate,
    groupController.updateMemberRole
);

router.get("/", authenticate, groupController.getMyGroups);
module.exports = router;