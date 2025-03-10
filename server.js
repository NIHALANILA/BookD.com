const express=require('express')
const app=express();
require('dotenv').config();
const db=require("./config/db");
const path=require('path')
const session=require('express-session')
const userRouter=require('./routes/userRouter');
const adminRouter=require('./routes/adminRouter')
const passport=require('./config/passport')

db()




app.use(express.json())
app.use(express.urlencoded({extended:true}));
/*app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))*/
app.use(session({
    secret: "your-secret-key",   // Use a strong secret key
    resave: false,
    saveUninitialized: false, // Change this to false if the session resets
    cookie: { secure: false, httpOnly: true, maxAge: 3 * 24 * 60 * 60 * 1000 } // 3 days
}));

app.use(passport.initialize());
app.use(passport.session())

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')))


app.use('/',userRouter)
app.use('/admin',adminRouter)


app.listen(process.env.PORT,()=>{
    console.log("hi serer")
    console.log('http://localhost:3000')
})