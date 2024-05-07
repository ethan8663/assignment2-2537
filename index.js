const express = require('express');
const session = require('express-session');
require('dotenv').config();
const mongoose = require('mongoose');
const MongoDBSession = require('connect-mongodb-session')(session);
const app = express();
const UserModel = require('./models/User');
const mongoURI = process.env.MONGO_URI
const bcrypt = require('bcryptjs');
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

app.use(session({
    secret: process.env.SESSION_SECRET,
    cookie: {maxAge: 30000},
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
    // console.log(req.session.id);
    req.session.isAuth = true;
    res.send('hello world');
});
app.get('/landing', (req, res) => {
    res.render('landing')
})
app.get('/register', (req, res) => {
    res.render("register")
})
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    // This line queries the database to find a user with the specified email. It uses the findOne() method of the UserModel to find a user document that matches the given email.
    let user = await UserModel.findOne({email});

    // If a user with the specified email already exists in the database, the code redirects the user to the /register page. This implies that the email is already registered, and the user should choose a different email.
    if (user) {
        return res.redirect('/register');
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
        return res.redirect('/login');

    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.redirect('/login');
    }
    req.session.isAuth = true;
    res.redirect('/dashboard')
})

app.get('/dashboard', isAuth, (req, res) => {
    res.render("dashboard")
})

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/');
    })
})
app.listen(3000, () => {
    console.log('listening');
})