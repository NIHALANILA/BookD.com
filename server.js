const express=require('express')
const app=express();
require('dotenv').config();
const db=require("./config/db");
const path=require('path')
const session=require('express-session')
const userRouter=require('./routes/userRouter');
const adminRouter=require('./routes/adminRouter')
const passport=require('./config/passport')
const flash = require("express-flash");
db()




app.use(express.json())
app.use(express.urlencoded({extended:true}));

app.use(session({
    secret: "your-secret-key",   
    resave: false,
    saveUninitialized: false, 
    cookie: { secure: false, httpOnly: true, maxAge: 3 * 24 * 60 * 60 * 1000 } 
}));
app.use(flash())

app.use(passport.initialize());
app.use(passport.session())

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')))



app.use('/',userRouter)
app.use('/admin',adminRouter)


app.listen(process.env.PORT,()=>{
    
    console.log('http://localhost:3000')
})