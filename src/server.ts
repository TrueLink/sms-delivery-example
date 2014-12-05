var browserify = require('browserify-middleware');
var express = require('express');
import path = require("path");

var app = express();

browserify.settings.development('basedir', __dirname);

app.get('/app.js', browserify(['./lib/app']));

app.use(express.static(path.resolve(process.cwd(), 'static')));

app.listen(3000);
console.log("http://127.0.0.1:3000");
