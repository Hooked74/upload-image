var fs = require('fs');
var async = require('async');
var gm = require('gm').subClass({ imageMagick: true });
var multiparty = require('multiparty');
var mongoose = require('mongoose');

//var Image = require('./models/image').Image;

var allData = function(req, res, next) {
    Image.find({}, function(err, images){
        if (err) return next(err);
        res.send('<pre>'
            + images
            + '</pre>');
    })
}

var upload = function(req, res, next){
    var form = new multiparty.Form(),
        maxSize = 1.5 * 1024 * 1024,
        title = new String();
    form.uploadDir = __dirname + '/tmp';

    function checkErrorForm (err) {
        req.resume();
        next(err);
    }

    function analysisPartForm (part) {
        async.waterfall([
            function (callback) {
                var err = part.name == 'image' ? null : "title";
                callback(err);
            },
            function (callback) {
                var err = part.headers['content-type'].split('/')[0] != 'image' ? "Unknown type" : null;
                callback(err);
            },
            function (callback) {
                var err = part.byteCount > maxSize ? "Max size is 1.5Mb" : null;
                callback(err);
            },
        ], function(err, result){
            if (err && err !== "title") return req.emit('error', err);
        })
    }

    function getTitle(name, value) {
        this._title = value;
    }

    function createUploadFile(name, file) {
        var disName = file.originalFilename.split('.'),
            ext = disName.pop(),
            originalFilename = disName.join('.'),
            iName = Math.ceil(Math.random() * 100000) + '_';

        iName += this._title ? this._title : originalFilename;

        var path = '/upload/' + iName + '.' + ext;

        async.waterfall([
            function (callback) {
                gm(file.path).size(function(err, size){
                    callback(err, size, this);
                });
            },
            function (size, context, callback) {
                context.resize(size.width + 200 , size.height + 200 );
                context.noProfile();
                context.write(__dirname + path, function(err){
                    callback(err);
                });
            },
            function (callback) {
                fs.unlink(file.path);
                callback(null)
            }
        ], function(err, result){
            if (err) return next(err);

        })
    }

    function closeForm(err){
        if (err) next(err);
    }

    form.on('error', checkErrorForm);
    form.on('part', analysisPartForm)
    form.on('field', getTitle)
    form.on('file', createUploadFile)
    form.on('close', closeForm)

    form.parse(req);
};

var render = function(req, res, next){

};

var crop = function(req, res, next) {
    console.log(req)
};

exports.routing = {
    upload: upload,
    getImg: render,
    allImg: allData,
    cropImg: crop
};
