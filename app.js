const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser");
const config44 = require("./src/.config44");
// cors
// helmet
require('dotenv').config();

// const utils = require("./src/index.js");
const { apiFactory } = require("./src/index");
const { global44 } = require("./src/index");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

app.all('*', (req, res, next) => {
  req.user = { "id": "44", "role": "admin" }
  console.log("req.user===");
  console.log(req.user)
  next()
})

// app.use(global44())
app.use(global44({
  apiVersion: 'v4',
  acceptLanguage: 'en',
  allow: 'GET, POST, PATCH, PUT, DELETE, HEAD, OPTION',
  accept: 'application/json',
  acceptPatch: 'application/json',
  acceptPost: 'application/json',
  acceptEncoding: 'gzip, deflate, br, compress',
  acceptLanguage: 'en',
  server: 'WikiAgoraSocial/4.0',
  xGenerator: 'WikiAgoraSocial'
}))

// app.all('*', (req, res, next) => {
//   console.log("res.header===");
//   console.log(res.header)
//   next()
// })

// Example: Create a User model first
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const options = {
  optionsHeader: config44.optionsHeader,
  optionsBody: config44.optionsBody,
  bulkOptions: config44.bulkOptions
}

app.head('/api/v4/users', apiFactory.head(User));
app.options('/api/v4/users', apiFactory.option(User, options));
// Use the apiFactory correctly - it's a factory that needs Model and options
// app.get('/api/v4/users', utils.apiFactory.getAll(User, {
app.get('/api/v4/users', apiFactory.getAll(User, {
  searchFields: ['name', 'email'],
  defaultSort: '-createdAt',
  defaultSelect: '-__v',
  config44: config44
}));
// {
//     "searchFields": "";
//     "defaultSelect": "";
//     "defaultSort": "";
//     "populate": "";
// }

app.head('/api/v4/users/:id', apiFactory.headOne(User));
app.options('/api/v4/users/:id', apiFactory.optionOne(User, options));
app.post('/api/v4/users', apiFactory.createOne(User));
app.get('/api/v4/users/:id', apiFactory.getOne(User));
app.patch('/api/v4/users/:id', apiFactory.updateOne(User));
app.put('/api/v4/users/:id', apiFactory.replaceOne(User));
app.delete('/api/v4/users/:id', apiFactory.deleteOne(User));

// bulk
app.head('/api/v4/users/bulk', apiFactory.bulkHead(User));
app.options('/api/v4/users/bulk', apiFactory.bulkOption(User, options));
app.post('/api/v4/users/bulk', apiFactory.bulkCreate(User));
app.patch('/api/v4/users/bulk', apiFactory.bulkUpdate(User));
app.put('/api/v4/users/bulk', apiFactory.bulkReplace(User));
app.delete('/api/v4/users/bulk', apiFactory.bulkDelete(User));

app.get('*', (req, res) => {
  try {
    console.log('all endpoint');
    console.log(`${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`);
    res.json({})
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'error',
    });
  }
});

mongoose
  .connect(process.env.DB_URI, {
    // useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
  })
  .then(() => console.log('✅ DB connection successful!'))
  .catch((err) => console.log('DB ERROR' + err));

const PORT = process.env.PORT || 4444;
app.listen(PORT, () => {
  console.log(`✅ App running on port ${PORT}!`);
});