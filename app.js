const express=require('express');
const app=express();
const usermodel=require('./models/user');
const postmodel=require('./models/post');
const cookieparser=require('cookie-parser');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt')


app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieparser());

app.get('/',(req,res)=>{
    res.render('index');  //render is used to connect the ejs file with  the server
})
app.get('/login',(req,res)=>{
    res.render('login'); 
})
app.get('/test',(req,res)=>{
    res.render('test'); 
     
})
app.get('/profile',isloggedIn,async(req,res)=>{
   let user=await usermodel.findOne({email:req.user.email}).populate('posts')
    res.render('profile',{user})
     //render is used to connect the ejs file with  the server
})
app.get('/like/:id',isloggedIn,async(req,res)=>{
   let post=await postmodel.findOne({_id:req.params.id}).populate('user')
   if(post.likes.indexOf(req.user.userid) === -1){
    post.likes.push(req.user.userid)//userid is created in token which we dcrypted in jwt.verify and returns 1
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.id),1);//post.likes.splice(1,1)
    }
   await post.save()
   res.redirect('/profile')

})
app.get('/edit/:id',isloggedIn,async(req,res)=>{
   let post=await postmodel.findOne({_id:req.params.id})
   res.render('edit',{post})

})
app.post('/update/:id',isloggedIn,async(req,res)=>{
   let post=await postmodel.findOneAndUpdate({_id:req.params.id},{content:req.body.content})
   res.redirect('/profile')

})

app.post('/register',async(req,res)=>{
    let{username,name,age,email,password}=req.body;
    let user=await usermodel.findOne({email});
    if(user) return res.status(500).send("user already registerd");

    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt, async(err,hash)=>{
           let user= await usermodel.create({
                username,
                name,
                age,
                email,
                password: hash
            })
            let token=jwt.sign({email:email,userid:user._id},"shhh");
            res.cookie("token",token);
            res.send("registered");
        })
    })
})
app.post('/login',async(req,res)=>{
    let{email,password}=req.body;
    let user=await usermodel.findOne({email});
    if(!user) return res.status(500).send("something went wrong");
1
    bcrypt.compare(password,user.password,function(err,result){
        if(result) {
            let token=jwt.sign({email:email,userid:user._id},"shhh");
            res.cookie("token",token); 
            res.status(200).redirect('/profile')}
         else res.redirect('/login')
         
 
    })
})
app.get('/logout',(req,res)=>{
   res.cookie("token",'')
   res.redirect('/login')
});

function isloggedIn(req,res,next){
    if(req.cookies.token ==='')res.redirect('/login') // === is for checking
        
        else{
    let data=jwt.verify(req.cookies.token,"shhh")
    req.user=data
    }
    next();   //calls the next middleware otherwise no other middlewire won't work
}
app.post('/post',isloggedIn,async(req,res)=>{
    let {content}=req.body;
    let user=await usermodel.findOne({email:req.user.email});//to find the user logged in
    let post=await postmodel.create({  //this post is used in ejs model in foreach function in profile.ejs
        user:user._id,
        content
    })
    user.posts.push(post._id);
    await user.save();  //as we forced the changes
    res.redirect('/profile')
})



app.listen(3500);