require('dotenv').config()
const express = require('express')
var jwt = require('jsonwebtoken')
var cookieParser = require('cookie-parser')
const app = express()
var bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { MongoClient } = require('mongodb');

// Connection URL
const url = "mongodb://localhost:27017"
const client = new MongoClient(url)
const dbName = 'mriirs';
let db;

// Database Name
const multer = require('multer')
app.use('/uploads', express.static('uploads'))

app.set("view engine", "ejs")

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniquePrefix + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })



// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.get('/', function (req, res) {
  res.render('home', {
    isAuthenticated: false
  })
})

app.get('/admin', async function (req, res) {
  try {
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db(dbName);
    const collection = db.collection('complaints');
    const findResult = await collection.find({}).toArray();
    console.log('Found documents =>', findResult);
    // the following code examples can be pasted here...
    res.render('admin', { complaints: findResult })

    return 'done.';
  } catch (e) {
    console.error(e);
  }
})

app.post('/', upload.single('uploaded_file'), function (req, res) {
  let a = req.body['user_email']
  let b = req.body['user_name']
  let c = req.body['user_location']
  let d = req.body['user_message']
  let e = req.file.path
  // console.log(a, b, c, d)

  async function main() {
    // Use connect method to connect to the server
    try {
      await client.connect();
      console.log('Connected successfully to server');
      const db = client.db(dbName);
      const collection = db.collection('complaints');
      // the following code examples can be pasted here...
      let result = await collection.insertOne({ email: a, name: b, location: c, message: d, img_path: e })
      return 'done.';
    } catch (e) {
      console.error(e);
    }
  }

  // console.log(e)
  // console.log(req.file)
  // console.log(req.body)


  main()
    .then(console.log)
    .catch(console.error)
    .finally(() => client.close());
  res.redirect('/')
})

app.post('/signup', async function (req, res) {
  let a = req.body['user_email']
  let b = req.body['user_pwd1']
  let c = req.body['user_pwd2']

  if (b != c)
    return res.send("Passwords dont match!")

  console.log("fun start")
  // Use connect method to connect to the server
  try {
    const collection = db.collection('users');
    const user = await collection.findOne({ email: a })
    console.log(user)

    if (user) {
      return res.send('User already')
    }

    const hashedPassword = await bcrypt.hash(b, 10)
    await collection.insertOne({ email: a, password: hashedPassword })
    return res.redirect('/')
    // the following code examples can be pasted here...
  } catch (e) {
    console.error(e);
    return res.send("There was an error!")
  }

})

app.get('/signup', function (req, res) {
  res.sendFile(__dirname + '/views/signup.html')
})

app.get('/login', function (req, res) {
  res.sendFile(__dirname + '/views/login.html')
})

app.post('/login', async function (req, res) {
  let a = req.body['user_email']
  let b = req.body['user_pwd']

  try {
    const collection = db.collection('users');
    const user = await collection.findOne({ email: a })

    console.log(user.password, b)

    const isPasswordValid = await bcrypt.compare(b, user.password)
    if (!isPasswordValid)
      return res.send("Invalid password")

    const token = jwt.sign({ email: a }, 'shhhhh');

    res.cookie("auth_token", token)
    res.render('home', {
      isAuthenticated: true
    })
  }catch(er){
    console.log(er)
    return res.send("Error")
  }


  
})

app.get('/logout', (req, res) => {
  res.clearCookie('auth_token')
  res.redirect('/login')
})

app.use(cookieParser())

app.get('/', function (req, res) {
  // Cookies that have not been signed
  console.log('Cookies: ', req.cookies)

  // Cookies that have been signed
  console.log('Signed Cookies: ', req.signedCookies)
})

app.listen(3000, async () => {
  await client.connect().then(() => {
    db = client.db(dbName);
  })
})