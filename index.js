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
// console.log(mongoURI);

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
    cookie: { maxAge: 3600000 }, // 1hour
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

const isAdmin = (req, res, next) => {
    if (req.session.isAdmin) {
        next()
    } else {
        res.render('login',{ isAdmin: false })
    }
}

app.use('/admin', isAdmin)

app.get('/nosql-injection', async (req, res) => {
    var username = req.query.user;

    if (!username) {
        res.send(`<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`);
        return;
    }
    console.log("user: " + username);

    const schema = Joi.string().max(20).required();
    const validationResult = schema.validate(username);

    //If we didn't use Joi to validate and check for a valid URL parameter below
    // we could run our userCollection.find and it would be possible to attack.
    // A URL parameter of user[$ne]=name would get executed as a MongoDB command
    // and may result in revealing information about all users or a successful
    // login without knowing the correct password.
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.send("<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>");
        return;
    }

    const result = await userCollection.find({ username: username }).project({ username: 1, password: 1, _id: 1 }).toArray();

    console.log(result);

    res.send(`<h1>Hello ${username}</h1>`);
});

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

const signupRouter = require('./routes/signup')
app.use('/signup', signupRouter)

// app.get('/signup', (req, res) => {
//     res.render("signup")
// })
// app.post('/signup', async (req, res) => {
//     // console.log('this is start of signup');
//     const { username, email, password } = req.body;


//     const schema = Joi.object({
//         username: Joi.string().alphanum().max(20).required(),
//         password: Joi.string().max(20).required(),
//         email: Joi.string().email().required()
//     });

//     const validationResult = schema.validate({ username, password, email });

//     if (validationResult.error) {
//         const errors = validationResult.error.details.map(error => error.message);
//         return res.render('signupSubmit', { errors });
//     }

//     // This line queries the database to find a user with the specified email. It uses the findOne() method of the UserModel to find a user document that matches the given email.
//     let user = await UserModel.findOne({ email });

//     // If a user with the specified email already exists in the database, the code redirects the user to the /register page. This implies that the email is already registered, and the user should choose a different email.
//     if (user) {
//         return res.render('signup', { isUnique: false });
//     }

//     const hashedPsw = await bcrypt.hash(password, 12);
//     user = new UserModel({
//         username,
//         email,
//         password: hashedPsw
//     });

//     await user.save();

//     res.redirect('/login')
// })

app.get('/login', (req, res) => {
    res.render("login");
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
        return res.render('signup', { hasUser: false });

    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.render('login', { isMatch: false });
    }
    req.session.isAuth = true;
    req.session.username = user.username;
    req.session.isAdmin = user.isAdmin;
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
    // let randomNumber = Math.floor(Math.random() * 3);
    // let path;
    // switch (randomNumber) {
    //     case 0: path = '/fluffy.gif'
    //         break;
    //     case 1: path = "/socks.gif"
    //         break;
    //     case 2: path = '/stretch.gif'
    //         break;

    // }
    let path = ['/fluffy.gif', "/socks.gif", '/stretch.gif']
    res.render("members", { username, path })
})

const readUsers = async () => {
    try {
        const users = await UserModel.find({});
        return users;
    } catch (err) {
        console.error('Error: ', err);
        
    }
}
app.get('/admin', async(req, res) => {
    const users = await readUsers();
    // console.log(users);
    res.render("admin", {users: users})
})

app.post('/admin', async(req, res) => {
    const name = req.body.username;
    const selectedUser = await UserModel.findOne({username: name});
    console.log(selectedUser);
    console.log(req.body.promote == '');
    if (req.body.promote == '') {
        selectedUser.isAdmin = true;
        // console.log('executed');
    } else {
        selectedUser.isAdmin = false;
        // console.log('no');
    }

    await selectedUser.save()
    console.log(selectedUser);
    res.render("admin", {msg: `${name} is modified`})
})

const commentRoute = require('./routes/comment')
app.use('/comment', commentRoute)
app.get('*', (req, res) => {
    res.status(404).render("notFound")
})
app.listen(3000, () => {
    console.log('listening 3000');
})