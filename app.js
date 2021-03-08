if(process.env.NODE_ENV != 'production') {
    require('dotenv').config();
}


const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const methodOveride = require('method-override');
const ejsMate = require('ejs-mate')
const Campground = require('./models/campGround');
const Review = require('./models/review');
const catchAsync = require('./utils/cathAsync');
const ExpressError = require('./utils/ExpressError')
const session = require('express-session')
const flash = require('connect-flash')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const User = require('./models/user')
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');






const userRoutes = require('./routes/user')
const campgroundRoutes = require('./routes/campground')
const reviewRoutes = require('./routes/reviews')
const MongoStore = require("connect-mongo").default;
//const dbUrl = process.env.DB_URL;
const dbUrl =  process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp'

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify : false
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

app.set('view engine', 'ejs')
app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, '/views'))
app.use(express.static(path.join(__dirname, '/public')))
app.use(express.urlencoded({ extended: true }));
app.use(methodOveride('_method'))
app.use(mongoSanitize({
    replaceWith : '_'
}))

const secret = process.env.SECRET || 'thisshouldbeabettersecret'

const store = MongoStore.create({
    mongoUrl : dbUrl,
    secret,
    touchAfter : 60*60*24
})

store.on("error",function(e) {
    console.log("Session Store Error",e)
})

const sessionConfig = {
    store,
    name : "session",
    secret,
    resave : false,
    saveUninitialized : true,
    cookie : {
        httpOnly : true,
        //secure : true,
        expires : Date.now() + 1000*60*60*24*7,
        maxAge : 1000*60*60*24*7
    }
}

app.use(session(sessionConfig));
app.use(flash());
app.use(helmet());


const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net"
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dvh924b56/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);



app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());





app.use((req,res,next) => {
    res.locals.success = req.flash('success')
    res.locals.error = req.flash('error')
    res.locals.currentUser = req.user;
    next();
})

app.use('/',userRoutes)
app.use('/campgrounds',campgroundRoutes)
app.use('/campgrounds/:id/reviews',reviewRoutes)



app.get('/fakerequest',async (req,res) => {
    const user = new User({email : 'mayurtrap@gmail.com' , username : 'mayur1064'});
    const newUser = await User.register(user,'Mayur@123')
    res.send(newUser)


})



app.get('/', (req, res) => {
    res.render('home')
})


app.all('*',(req,res,next) => {
    throw new ExpressError('Page Not Found',404) 
})


app.use((err,req,res,next) => {
    const {statusCode = 500} = err;
    if(!err.message) {
        err.message = 'Something went Wrong !'
    }
    res.status(statusCode).render('campgrounds/error',{err})
})


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Listening to Port 3000")

})
