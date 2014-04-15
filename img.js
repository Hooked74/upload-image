var fs = require('fs');
var async = require('async');
var gm = require('gm').subClass({ imageMagick: true });
var multiparty = require('multiparty');
var mongoose = require('mongoose');

var Image = require('./models/image').Image;

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
            iName = Math.ceil(Math.random() * 100000) + '-';

        iName += this._title ? this._title : originalFilename;

        var path = '/upload/' + iName + '.' + ext;

        async.waterfall([
            function (callback) {
                gm(file.path).size(function(err, size){
                    callback(err, size, this);
                });
            },
            function (size, context, callback) {
                var width = size.width + 200;
                var height = size.height + 200;
                var size = width + "x" + height;

                context.resize(width, height);
                context.noProfile();
                context.write(__dirname + path, function(err){
                    callback(err, size);
                });
            },
            function (size, callback) {
                fs.unlink(file.path);
                callback(null, size)
            },
            function(size, callback){
                var image = new Image({ name: iName, url: path, size: size });
                image.save(callback)
            },
            function(callback){
                res.redirect('/img/' + iName);
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
    try {
        var id = mongoose.Types.ObjectId(req.params.url);
        var query = { $or: [ { name: req.params.url }, { _id: id } ] };
    } catch (e){
        var query = { name: req.params.url };
    }

    Image.findOne(query, function(err, record){
        if (err) return next(err);
        if (!record) return next("Record was not found");
        if (req.query.hasOwnProperty('crop')){
            var cropImg = _crop(record, req.query, getCropParams);
            if (cropImg instanceof Error) {
               return next(cropImg.message);
            } else {
                var name = record.name + '_crop';
                var url = cropImg;
            }
        } else {
            var name = record.name;
            var url = record.url;
        }
        res.send("<figure style='text-align: center;'>"
                + "<a href='" + url + "'>"
                + "<img width='300' src='" + url + "' alt='" + name + "'/>"
                + "</a>"
                + "<figcaption>" + name + "</figcaption>"
                + "</figure>");
    })
};

var _crop = function(record, query, cb) {
    if (typeof cb !== 'function') return new Error("No callback");

    var result = cb.apply(this, Array.prototype.slice.call( arguments, 0, -1 ));
    if (!result) return new Error("Unknow parametrs");

    var img = record.url,
        cutPath = img.substr(0, img.lastIndexOf('.')).split('/'),
        nameImage = cutPath.pop(),
        ext = img.slice(-img.length + img.lastIndexOf('.')),
        cropImagePath = cutPath.join('/') + '/crop/' + nameImage + '_crop' + ext;


    fs.exists(__dirname + cropImagePath, function(exists) {
        if (exists) {
            gm(__dirname + cropImagePath).size(function(err, size){
                if (err) throw err;
                if (size.width == result.x2 && size.height == result.y2) return;
                fs.unlink(__dirname + cropImagePath, function(err){
                    if (err) throw err;
                    setCroppedImage()
                });
            })
        } else {
            setCroppedImage()
            Image.update(
                {_id: record._id},
                { $set: {'cropUrl': cropImagePath}},
                function(err, result) {
                    if (err) throw err;
            });
        }

    });

    function setCroppedImage () {
        var writeStream = fs.createWriteStream(__dirname + cropImagePath);
        gm(__dirname + img)
            .crop(result.x2, result.y2, result.x1, result.y1)
            .stream()
            .pipe(writeStream);
    }

    return cropImagePath;
};

var isNumeric = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

var getCropParams = function(record, query) {
    var size = record.size.split('x');
    var width = size[0];
    var height = size[0];

    if ( !(isNumeric(query.x1)
               || isNumeric(query.x2)
               || isNumeric(query.y1)
               || isNumeric(query.y2)) ) return false;

    var x1 = !isNumeric(query.x1) ? 0 :
            width < +query.x1 ? 0 : query.x1;
    var y1 = !isNumeric(query.y1) ? 0 :
            height < +query.y1 ? 0 : query.y1;
    var x2 = !isNumeric(query.x2) ? width :
            width < +query.x2 ? width : query.x2;
    var y2 = !isNumeric(query.y2) ? height :
            height < +query.y2 ? height : query.y2;

    return {x1: +x1, x2: +x2, y1: +y1, y2: +y2};
}

exports.routing = {
    upload: upload,
    getImg: render,
    allImg: allData
};
