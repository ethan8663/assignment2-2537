const express = require('express');
const session = require('express-session');
require('dotenv').config();
const mongoose = require('mongoose');
const MongoDBSession = require('connect-mongodb-session')(session);
const app = express();
const UserModel = require('./models/User');
const mongoURI = process.env.MONGO_URI
const bcrypt = require('bcryptjs');
const Joi = require("joi");
// console.log(process.env.SESSION_SECRET);

mongoose.connect(mongoURI)
.then(res => {
    console.log('connected');
})

const store = new MongoDBSession({
    uri: mongoURI,
    collection: 'mySessions2'
})

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

app.use(session({
    secret: process.env.SESSION_SECRET,
    cookie: {maxAge: 3600000 }, // 1hour
    saveUninitialized: false,
    resave: false,
    store: store
}))

const isAuth = (req, res, next) => {
if (req.session.isAuth) {
    next();
} else {
    res.redirect('/login')
}
}

app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        // User is logged in
        const username = req.session.user.username;
        res.render('landing', { username, loggedIn: true });
    } else {
        // User is not logged in
        res.render('landing', { loggedIn: false });
    }
});

app.get('/signup', (req, res) => {
    res.render("signup")
})
app.post('/signup', async (req, res) => {
    // console.log('this is start of signup');
    const { username, email, password } = req.body;


    const schema = Joi.object({
        username: Joi.string().alphanum().max(20).required(),
        password: Joi.string().max(20).required(),
        email: Joi.string().email().required()
    });

    const validationResult = schema.validate({username, password, email});

	if (validationResult.error) {
        const errors = validationResult.error.details.map(error => error.message);
        return res.render('signupSubmit', { errors });
    }

    // This line queries the database to find a user with the specified email. It uses the findOne() method of the UserModel to find a user document that matches the given email.
    let user = await UserModel.findOne({email});

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

app.get('/login', (req, res) => {
    res.render("login");
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await UserModel.findOne({email});

    if (!user) {
        return res.render('signup', { hasUser: false });

    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.render('login', { isMatch: false });
    }
    req.session.isAuth = true;
    req.session.username = user.username;

    res.render('landing', { username: user.username, loggedIn: true });
})

app.get('/landing', isAuth, (req, res) => {
    const username = req.session.user.username;
    res.render('landing', { username, loggedIn: true });
})

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/');
    })
})

app.get('/signupSubmit', (req, res) => {
    res.render("signupSubmit")
})

app.get('/members', (req, res) => {
    if (!req.session.isAuth) {
        res.redirect('/login');
        return;
    }
    const username = req.session.username;
    // console.log(req.session.username);
    let randomNumber = Math.floor(Math.random() * 3);
    let path;
    switch (randomNumber) {
        case 0: path = '/fluffy.gif'
        break;
        case 1 : path = "/socks.gif"
        break;
        case 2: path = '/stretch.gif'
        break;

    }
    res.render("members", {username, path})
})

app.get('*', (req, res) => {
    res.status(404).render("notFound")
})
app.listen(3000, () => {
    console.log('listening');
})