var express = require('express');
var app = module.exports = express();


app.get('/', function(req, res){
    res.send('<form method="post" enctype="multipart/form-data">'
        + '<p>Title: <input type="text" name="title" /></p>'
        + '<p>Image: <input type="file" name="image" /></p>'
        + '<p><input type="submit" value="Upload" /></p>'
        + '</form>');
});

var routing = require('./img').routing;

app.post('/', routing.upload);
app.get('/img/:url', routing.getImg);

app.listen(3000);
console.log('Express started on port 3000');
