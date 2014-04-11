/**
 * загружает файл
 * делает проверки.
 * при привышении размера файла обрывает загрузку, удаляет временный файл
 * http://youtu.be/_j0LoOXnOF4 - информация по случаю
 * @param req
 * @param res
 */
var upload = function(req, res){
    // upload file
    // очень важный пункт: validate (max size 1.5 Mb, 200px<height<1000px, 200px<width<2000px)
    // can use node module "gm"
    // save img in db
    // prepare model
    var imgModel = {
        url: '' // url до картинки
        // еще поля по необходимости, необходимость должна быть обоснована
    };
    res.send(imgModel);
};

var render = function(req, res){
    // get img from db by id|url
    // render img to res
    res.send("");
};

/**
 * задание со звездочкой
 * только после реализованной валидации при загрузке
 * @param img
 * @param cb
 * @private
 */
var _crop = function(img, cb){
    // use gm crop img
    // save to db
    // result to cb(err, resultImgModel)
};

exports.routing = {
    upload: upload,
    getImg: render
};
