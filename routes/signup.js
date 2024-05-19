/*
to use router, first cut the code in index.js 
create js file in routes folder
paste the code and require express, express.Router()
replace app with router 
module.export = router 
in index.js 
const __router = require(path)
app.use(path, __router)
*/

const express = require('express')
const Joi = require("joi");
const UserModel = require('../models/User');
const bcrypt = require('bcryptjs');
const router = express.Router();

router.get('/', (req, res) => {
    res.render("signup")
})
router.post('/', async (req, res) => {
    // console.log('this is start of signup');
    const { username, email, password } = req.body;


    const schema = Joi.object({
        username: Joi.string().alphanum().max(20).required(),
        password: Joi.string().max(20).required(),
        email: Joi.string().email().required()
    });

    const validationResult = schema.validate({ username, password, email });

    if (validationResult.error) {
        const errors = validationResult.error.details.map(error => error.message);
        return res.render('signupSubmit', { errors });
    }

    // This line queries the database to find a user with the specified email. It uses the findOne() method of the UserModel to find a user document that matches the given email.
    let user = await UserModel.findOne({ email });

    // If a user with the specified email already exists in the database, the code redirects the user to the /register page. This implies that the email is already registered, and the user should choose a different email.
    if (user) {
        return res.render('signup', { isUnique: false });
    }

    const hashedPsw = await bcrypt.hash(password, 12);
    user = new UserModel({
        username,
        email,
        password: hashedPsw
    });

    await user.save();

    res.redirect('/login')
})

module.exports = router