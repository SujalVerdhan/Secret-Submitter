const express=require("express");
require("dotenv").config()
const bodyparser=require("body-parser")

const mongoose=require("mongoose")
const session=require("express-session")
const passport=require("passport")
const passportLocalMongoose=require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate")
const app=express()
app.use(bodyparser.urlencoded({extended:true}))
// const bcrypt=require("bcrypt")---------------------------\
                                                                // Level-3 encryption
// const encrypt=require("mongoose-encryption")-------------/
// const md5=require("md5")    ---------->Level -2 encryption

app.set("view engine", "ejs")
app.use(express.static("public"))
app.use(session({
    secret:"This is our secret",
    resave: false,
    saveUninitialized: false,

}))
app.use(passport.initialize())
app.use(passport.session())
mongoose.connect(process.env.MONGO_CONNECT)
const userSchema=new mongoose.Schema({
    username:String,
    password:String,
    googleId:String,
    secret:String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)
// const saltrounds=10;

// const secrets="Thisisoursecretkey";
// userSchema.plugin(encrypt,{secret:secrets,encryptedFields: ['password'] })   ------> Level 1 encryption

    const User=mongoose.model("User",userSchema)
    passport.use(User.createStrategy())
    passport.serializeUser(function(user, cb) {
        process.nextTick(function() {
          return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
          });
        });
      });
      
      passport.deserializeUser(function(user, cb) {
        process.nextTick(function() {
          return cb(null, user);
        });
      });


    passport.use(new GoogleStrategy({
        clientID:process.env.CLIENT_ID,
        clientSecret:process.env.CLIENT_SECRET,
        callbackURL: "https://secretsubmitter.onrender.com/auth/google/secrets",
        userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
      },
      function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
          return cb(err, user);
        });
      }
    ));

app.route("/").get(function(req,res){
   
    res.render("home")
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.

    res.redirect("/secrets");
  });
app.route("/logout").get(function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/")
        }
    });
      
})

app.route("/secrets").get(function(req,res){
    async function find(){
 const found= await User.find({secret:{$ne:null}});
 console.log(found)
 if(!found){
    console.log("No user found with secret")
 }
 else{
    res.render("secrets",{users:found})
 }
    }
    find();
    })
    app.route("/submit").get(function(req,res){
        if(req.isAuthenticated()){
            res.render("submit")
        }else{
            res.redirect("/login")
        }
    })
.post(function(req,res){
    console.log(req.user)
    const secret=req.body.secret;
    async function find(){
   const found= await User.findById({_id:req.user.id})
   if(!found){
    console.log("user not found");
   }else{
    found.secret=secret
    found.save();
        res.redirect("/secrets")
    

   }
    }
    find();
})
app.route("/register")
.get(function(req,res){
    res.render("register",{message:""})
})

.post(function(req,res){
    // const users=req.body.username     ----->for level 3 authentication
    // const pass=req.body.password
    // if (pass.length===0){
    //     res.render("register",{message:"Please enter your password"})
    // }
    // else{
    //     // md5(pass)   ------>For Level- 2  encryption

    //     bcrypt.hash(pass, saltrounds, function(err, hash) {
    //         const user=new User({
    //             username:users,
    //             password:hash
    //         })
    //         user.save()
    //         res.render("secrets")
            
    //     });

    // }

User.register({username: req.body.username},req.body.password,function(err,user){
    if(err){
        console.log(err)
        res.redirect("/register")
    }
    else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets")
        });
        
    }
      
    
});
});






app.route("/login")
.get(function(req,res){
    
res.render("login")
})


.post(function(req,res){
    // async function find(){  --------------------->level-3 encrption
    //     const found=await User.findOne({username:req.body.username})
    //     bcrypt.compare(req.body.password, found.password, function(err, result) {
    //         if(result==true){
    //             res.render("secrets")
    //         } else{
    //             res.send("wrong pass")
    //         }
           
    //     })
    // }
    // find()
const user=new User({
    username:req.body.username,
    password:req.body.password
})
req.login(user,function(err){
if(err){
    console.log(err)

}else{
    passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets")
    });
   
}
})
});
        
       
    


app.listen("3000",function(){
console.log("server running")
})
