const router = require('express').Router();

router.use('/', require('./authRoutes.js'));
router.use('/', require('./campaignRoutes.js'));
router.use('/', require('./employeeRoutes.js'));
router.use('/', require('./groupRoutes.js'));
router.use('/', require('./miscRoutes.js'));
router.use('/', require('./profileRoutes.js'));

module.exports = router;