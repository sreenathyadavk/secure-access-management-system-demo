const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { changeRoleSchema } = require('../validations/admin.schema');

const router = express.Router();

router.use(protect);
router.use(restrictTo('ADMIN'));

router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/role', validate(changeRoleSchema), adminController.changeUserRole);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
