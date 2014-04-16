var fs = require('fs');
var async = require('async');
var gm = require('gm').subClass({ imageMagick: true });
var multiparty = require('multiparty');
var mongoose = require('mongoose');

var Image = require('./models/image').Image;

/**
 * Выводит все записи из базы upload_images в формате json
 *
 * @param {object} req Объект запроса («request»), из него читаем данные.
 * @param {object} res Объект ответа («response»), в него пишем данные.
 * @param {function} next Передает управление на следующий маршрут.
 */
var allData = function(req, res, next) {
    Image.find({}, function(err, images){
        if (err) return next(err);
        res.send('<pre>'
            + images
            + '</pre>');
    })
}

/**
 * Проверяет валидность картинки
 * Загружает картинку на сервер
 * После успешной загрузки записывает необходимые параметры картинки в базу
 *
 * @param {object} req Объект запроса («request»), из него читаем данные.
 * @param {object} res Объект ответа («response»), в него пишем данные.
 * @param {function} next Передает управление на следующий маршрут.
 */
var upload = function(req, res, next){
    //создаем объект формы с определенными пораметрами
    var form = new multiparty.Form(),
        maxSize = 1.5 * 1024 * 1024, // максимальный размер файла
        title = new String();
    form.uploadDir = __dirname + '/tmp'; //путь до директории с временными файлами

    //Событие обрабатывающее ошибки при парсинге формы
    function checkErrorForm (err) {
        req.resume(); //возобновляем поток данных
        next(err); //переходим к middleware, обрабатывающему
    }

    //Событие анализирующее части формы,
    //еще до загрузки формы
    function analysisPartForm (part) {
        //асинхронный вызов функций
        //функции из массивы вызываются последовательно
        //по окончании цепочку, вызывается второй аргумент
        //при возникновении ошибки, цепочка прерывается и вызывается второй аргумент
        async.waterfall([
            //является ли данная часть файлом
            function (callback) {
                var err = part.name == 'image' ? null : "title";
                callback(err);
            },
            //является ли переданный файл картинкой
            function (callback) {
                var err = part.headers['content-type'].split('/')[0] != 'image' ? "Unknown type" : null;
                callback(err);
            },
            //проверка на максимальный размер картинки
            function (callback) {
                var err = part.byteCount > maxSize ? "Max size is 1.5Mb" : null;
                callback(err);
            },
        ], function(err, result){
            if (err === "title") return;
            if (err) return req.emit('error', err);
        })
    }

    //событие обрабатывающее текстовое поле
    //name - название поля
    //value - значение поля
    function getTitle(name, value) {
        //контекст - this === form
        //получаем значение поля title и записываем в приватное свойство _title
        this._title = value;
    }

    //событие обрабатывающее файлы
    //name - название поля
    //file - содержимое поля
    function createUploadFile(name, file) {
        //создаем уникальное имя файла
        var disName = file.originalFilename.split('.'),
            ext = disName.pop(),
            originalFilename = disName.join('.'),
            iName = Math.ceil(Math.random() * 100000) + '-';

        iName += this._title ? this._title : originalFilename; //если поле title не пустое, то заменяем оригинальное имя на содержимое title

        //задаем путь до файла
        var path = '/upload/' + iName + '.' + ext;

        async.waterfall([
            //в следующий callback передаем размеры файла и контекст graphic magic
            function (callback) {
                gm(file.path).size(function(err, size){
                    callback(err, size, this);
                });
            },
            function (size, context, callback) {
                //изменяем размеры файла на 200px
                var width = size.width + 200;
                var height = size.height + 200;
                var size = width + "x" + height;

                context.resize(width, height);
                context.noProfile();
                //записываем новый файл в директорию upload
                context.write(__dirname + path, function(err){
                    //в следующий callback передаем строку {width}x{height}
                    callback(err, size);
                });
            },
            function (size, callback) {
                //удаляем temp файл из директории tmp
                fs.unlink(file.path);
                //в следующий callback передаем строку {width}x{height}
                callback(null, size)
            },
            function(size, callback){
                //создаем экземпляр Image с обязательными полями
                var image = new Image({ name: iName, url: path, size: size });
                //сохраняем данную запись в базе
                image.save(callback)
            },
            function(callback){
                //редиректим на нашу картинку
                res.redirect('/img/' + iName);
            }

        ], function(err, result){
            if (err) return next(err); //если ошибка, то переходим к middleware, обрабатывающему ошибки

        })
    }

    //Событие срабатывающее после того как все части были разобраны
    function closeForm(err){
        //если ошибка, то переходим к middleware, обрабатывающему ошибки
        if (err) next(err);
    }

    //обработка событий формы
    form.on('error', checkErrorForm);
    form.on('part', analysisPartForm)
    form.on('field', getTitle)
    form.on('file', createUploadFile)
    form.on('close', closeForm)

    //Разбираем запрос, содержащий данные формы
    form.parse(req);
};

/**
 * Выводит картинку на экран
 * Если существует поле crop в запросе (req.query), то выводит обрезанную картинку
 *
 * @param {object} req Объект запроса («request»), из него читаем данные.
 * @param {object} res Объект ответа («response»), в него пишем данные.
 * @param {function} next Передает управление на следующий маршрут.
 */
var render = function(req, res, next){
    try {
        var id = mongoose.Types.ObjectId(req.params.url); //если req.params.url не 24 символа, то выбрасывает исключение
        // запрос к базе id | name
        var query = { $or: [ { name: req.params.url }, { _id: id } ] };
    } catch (e){
        // запрос к базе name
        var query = { name: req.params.url };
    }

    Image.findOne(query, function(err, record){ //поиск одной записи соответствующей query
        if (err) return next(err);
        if (!record) return next("Record was not found"); //записей не найдено
        if (req.query.hasOwnProperty('crop')){ //если поле crop было передано в get-запросе
            var cropImg = _crop(record, req.query, getCropParams);
            if (cropImg instanceof Error) { //если функция _crop вернула ошибку
               //выходим из callback и переходим к middleware, обрабатывающему ошибки
               return next(cropImg.message);
            } else {
                //данные обрезанной картинки
                var name = record.name + '_crop';
                var url = cropImg;
            }
        } else {
            //данные оригинальной картинки
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

/**
 * Обрезает картинку по параметрам из запроса (query)
 * Обнавляет соответствующую запись в базе, добавив к ней адрес обрезанной картинки
 *
 * @param {object} record Объект, содержащий данные записи из базы.
 * @param {object} query Объект, собержащий параметры get-запроса.
 * @param {function} cb Функция обратного вызова, использующаяся для получения параметров обрезки.
 * @return {string} Адрес обрезанной картинки.
 */
var _crop = function(record, query, cb) {
    //проверка на callback.
    //Если false возвращаем ошибку
    if (typeof cb !== 'function') return new Error("No callback");

    //вызывае callback, передаем record и query
    var result = cb.apply(this, Array.prototype.slice.call( arguments, 0, -1 )); //false || {x1: +x1, x2: +x2, y1: +y1, y2: +y2}
    if (!result) return new Error("Unknow parametrs");

    //Генерируем адрес обрезанной картинки - cropImagePath
    var img = record.url,
        cutPath = img.substr(0, img.lastIndexOf('.')).split('/'),
        nameImage = cutPath.pop(),
        ext = img.slice(-img.length + img.lastIndexOf('.')),
        cropImagePath = cutPath.join('/') + '/crop/' + nameImage + '_crop' + ext;

    //проверка на существование файла

    fs.exists(__dirname + cropImagePath, function(exists) { // адрес файла и callback
        if (exists) { //Файл уже существует
            //получаем размеры обрезанного файла
            gm(__dirname + cropImagePath).size(function(err, size){
                if (err) throw err;
                //если размеры существующего файла
                //совпадают с переданными размерами
                //выходим из функции
                if (size.width == result.x2 && size.height == result.y2) return;
                //удаляем существующий файл
                fs.unlink(__dirname + cropImagePath, function(err){
                    if (err) throw err;
                    setCroppedImage()
                });
            })
        } else { //файл не существует
            setCroppedImage()
            //берем запись из базы по _id и обновляем поле cropUrl,
            //путем записи в него адреса обрезанной картинки
            Image.update(
                {_id: record._id},
                { $set: {'cropUrl': cropImagePath}},
                function(err, result) {
                    if (err) throw err;
            });
        }

    });

    // создание обрезанного файла, используя потоки
    function setCroppedImage () {
        //создаем объект потока записи файла
        var writeStream = fs.createWriteStream(__dirname + cropImagePath);
        gm(__dirname + img) //вызываем Graphic Magic и передаем путь оригинальной картинки
            .crop(result.x2, result.y2, result.x1, result.y1) // crop(width, heigth, x, y), x и y начальные координаты
            //Синхронизация данных адресата и источника
            .stream()
            .pipe(writeStream);
    }

    return cropImagePath;
};


/**
 * Проверяет является ли n числом.
 *
 * @return {boolean}.
 */
var isNumeric = function (n) {
    //parseFloat(true/false/null/'') вернёт NaN для этих значений
    //isFinite(n) преобразует аргумент к числу и возвращает true, если это не Infinity/-Infinity/NaN.
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Выводит все записи из базы upload_images в формате json
 *
 * @param {object} record Объект, содержащий данные записи из базы.
 * @param {object} query Объект, собержащий параметры get-запроса.
 * @return {object} Параметры обрезки.
 */
var getCropParams = function(record, query) {
    // получаем ширину и высоту картинки
    var size = record.size.split('x');
    var width = size[0];
    var height = size[0];

    //проверяем, если не один из параметров запроса
    //не является числом возвращаем false
    if ( !(isNumeric(query.x1)
               || isNumeric(query.x2)
               || isNumeric(query.y1)
               || isNumeric(query.y2)) ) return false;

    //x1 и y1  - позиция с которой начитается обрезка
    //x2 и y2  - ширина и высота обрезки
    //Если переданный параметр чило, то проверяем
    //не выходит ли оно за пределы картинки
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
