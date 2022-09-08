const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth')
const User = require('../models/user')
const isAuth = require('../middleware/isAuth')

router.post('/signup', [body('email')
    .isEmail()
    .withMessage('please enter a valid email.')
    .custom((value) => {
        return User.findOne({ email: value }).then((userDoc) => {
            if (userDoc)
                return Promise.reject("Email already exists")
        })
    })
    .normalizeEmail(), body('password').isLength({ min: 5 }).withMessage(`password length must be at least 5 `), body('name').trim().isLength({ min: 3 }).withMessage(`name length must be at least 3 chracters long `)], authController.signup)


router.post('/login', [body('email')
    .isEmail()
    .withMessage('please enter a valid email.'), body('password').isLength({ min: 5 }).withMessage(`password length must be at least 5 `)], authController.login)

router.post('/verify/:token', authController.verifyEmail)
router.post('/forgetPassword', authController.resetPassword)

router.post('/resetPassword', authController.updatePassword)
router.put('/updateProfile',isAuth,authController.updateProfile)

module.exports = router;