var mongoose = require('../libs/mongoose'),
    Schema = mongoose.Schema;

var Image = new Schema({
    name: {   //Поле для содержащее имя картинки. Проиндексировано и является обязательным.
        type: String,
        unique: true,
        required: true
    },
    url: {  //Поле с адресом  картинки. Является обязательным.
        type: String,
        required: true
    },
    created:{ //Дата записи на сервер. Не обязательное поле, имеет дефолтное значение - текущая дата и время.
        type: Date,
        default: Date.now
    },
    size:{ //Размеры картинки. Данный параметр обязателен и необходим при использовании обрезки картинки.
        type: String,
        required: true
    },
    cropUrl:{ //Хранит ссылку на обрезанную картинку. Поле не является обязательным.
        type: String
    }
});

exports.Image = mongoose.model('Image', Image);
