const User = require('../models/user');
const bcrypt = require('bcryptjs')
const nodeMailer = require('nodemailer');
const crypto = require('crypto')
const { validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
const deleteFile = require('../util/deleteFile')

// eslint-disable-next-line no-undef
var userEmail = process.env.USER_EMAIL;
// eslint-disable-next-line no-undef
var userPassword = process.env.USER_PASSWORD;

var transporter = nodeMailer.createTransport(`smtps://${userEmail}:${userPassword}@smtp.gmail.com`);

exports.signup = (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        let error = new Error("validation failed");
        error.statusCode = 422;
        error.data = errors.array();
        next(error);
    }

    //  check if the user have added the file 
    if (req.file == undefined) {
        const error = new Error('no profile image provided.');
        error.statusCode = 422;
        next(error);
        return;
    }

    const email = req.body.email;
    const name = req.body.name
    const password = req.body.password;
    const imageUrl = req.file.path;





    const hash = bcrypt.hashSync(password, 12);

    const newUser = new User({ name, email, password: hash, imageUrl, isVerified: false });

    newUser.save()
        .then((user) => {
            const token = jwt.sign({
                userId: user._id.toString(),
            }, 'secret', { expiresIn: '1h' })


            var mailOptions = {
                from: 'farhanbajwa46@gmail.com',    // sender address
                to: user.email, // list of receivers
                subject: 'email verification', // Subject line
                text: 'Verify your Email Address click the link below',       // plaintext body
                html: `<h6>Verify your Email Address click the link below</h6>
                    <p>click this link <a href="https://authtestapi.herokuapp.com/auth/verify/${token}">to verify email</a> to set password. </p>` // html body
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });

            res.status(200).json({ message: "you will receive verification email shortly" });


        }).catch(err => {
            if (!err.statusCode)
                err.statusCode = 500;

            next(err)
        })


}


exports.verifyEmail = (req, res, next) => {

    const token = req.params.token;
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, "secret")
    } catch (err) {
        err.statusCode = 500
        throw err;
    }
    if (!decodedToken) {
        const error = new Error("invalid Token");
        error.statusCode = 401;
        throw error;
    }

    User.findOne({ _id: decodedToken.userId }).then((user) => {
        user.isVerified = true;
        return user.save();
    }).then(() => {
        res.status(200).json({ message: "Successully verified" })
    }).catch((err) => {
        next(err);
    })
}

exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        let error = new Error("validation failed");
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    let loadUser;
    User.findOne({ email: email }).then((user) => {
        if (!user) {
            const error = new Error("No user exist with this email address");
            error.statusCode = 401;
            throw error;
        }
        if (!user.isVerified) {
            const error = new Error("No user exist with this email address");
            error.statusCode = 401;
            throw error;
        }

        loadUser = user
        return bcrypt.compare(password, user.password)
    }).then((isEqual) => {
        if (!isEqual) {
            const error = new Error("Wrong password");
            error.statusCode = 401;
            throw error;
        }

        const token = jwt.sign({
            email: loadUser.email,
            userId: loadUser._id.toString(),
        }, 'secret', { expiresIn: '1h' })

        res.status(200).json({ token})
    }).catch((err) => {
        if (!err.statusCode) {
            err.statusCode = 500;

        }
        next(err)
    })
}


exports.resetPassword = (req, res, next) => {
    const email = req.body.email;

    User.findOne({ email }).then((user) => {
        if (!user) {
            const error = new Error("No user exist with this email address");
            error.statusCode = 401;
            next(error);
        }
        return user
    }).then((user) => {
        const buffer = crypto.randomBytes(32)
        const token = buffer.toString('hex');
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        var mailOptions = {
            from: 'farhanbajwa46@gmail.com',    // sender address
            to: user.email, // list of receivers
            subject: 'password reset', // Subject line
            text: 'Hello world from Node.js',       // plaintext body
            html: `<p>you requested a password reset</p>
                        <p>click this link <a href="https://authtestapi.herokuapp.com/auth/resetPassword/${token}">reset password</a> to set password. </p>` // html body
        };



        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        return user.save();




    }).then(() => {
        res.status(200).json({ message: "you will receive verification email shortly" });
    }).catch((err) => {
        if (!err.statusCode)
            err.statusCode = 500;
        next(err)
    })

}

exports.updatePassword = (req, res, next) => {
    const newPassword = req.body.password;
    const authHeader = req.get('Authorization');

    if (!authHeader) {
        const error = new Error('Not authenticated.');
        error.statusCode = 401;
        throw error;
    }

    const token = authHeader.split(' ')[1];


    let newUser;

    User.findOne({ resetToke: token, resetTokenExpiration: { $gt: Date.now() } }).then((user) => {
        if (user == undefined || user == null) {
            res.status(401).json({ message: 'link is expired retry reset password' })
            return;
        }
        newUser = user
        return bcrypt.hash(newPassword, 12)
    }).then((pswrd) => {
        newUser.password = pswrd;
        newUser.resetToken = undefined;
        newUser.resetTokenExpiration = undefined
        return newUser.save();
    }).then(() => {
        res.status(201).json({ message: "password updated successfully" })
    }).catch((err) => {
        next(err)
    })
}


exports.updateProfile = (req, res, next) => {
    User.findOne({ _id: req.userId }).then((user) => {
        user.name = req.body.name || user.name;
        if (req.file) {
            deleteFile(user.imageUrl)
            user.imageUrl = req.file.path;
        }

        return user.save();
    }).then(() => {
        res.status(204).json({ message: "profile updated" })
    }).catch((err) => {
        next(err)
    })
}