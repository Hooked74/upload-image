var express = require('express');
var logger = require('morgan');
var path = require('path');
var config = require('./config');
var routing = require('./img').routing;


var app = module.exports = express();

app.use(logger('dev'));
app.use('/upload', express.static(path.join(__dirname, '/upload')));

app.use(function(err, req, res, next){
    res.send(err);
})

app.route('/')
    .get(function(req, res, next){
        res.send('<form method="post" enctype="multipart/form-data">'
            + '<p>Title: <input type="text" name="title" /></p>'
            + '<p>Image: <input type="file" name="image" /></p>'
            + '<p><input type="submit" value="Upload" /></p>'
            + '</form>');
    })
    .post(routing.upload);

app.get('/img/:url', routing.getImg);
app.get('/img/:url/?crop&x1=:x1&y1=:y1&x2=:x2&y2=:y2', routing.cropImg);
app.get('/all', routing.allImg);

app.get('*', function(req, res, next){
    next("Not found");
});

app.listen(config.get("port"));
console.log('Express started on port ' + config.get("port"));
