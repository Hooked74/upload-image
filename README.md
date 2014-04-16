# uImage

Загрузка картинок на сервер.
Обрезка картинок.

## Установка

### Создание директорий

Создать следующие директории:

* /tmp
* /upload
* /upload/crop
* /db/Data
* /db/Log

### Запуск mongoDB

Скачать и установить [mongoDb](https://www.mongodb.org/downloads).

Изменить файл `/db/Binary/config/mongodb.conf` при необходимости(поменять пути `dbpath` и `logpath`)

Из консоли запустить `mongod.exe`

```
mongod --config /db/Binary/config/mongodb.conf
```

Запустить `mongo.exe` 

```
mongo localhost:9999
```

Создать базу `upload_images` и пользователя 

```
use upload_images
db.addUser({user:"user", pwd:"password", roles:[]})
```
`user` и `password` обязательно синхронизировать с данными в файле `/config/config.json`

### Установка дополнительных компонентов

Чтобы полноценно использовать приложение необходимо установить [GraphicsMagick](http://www.graphicsmagick.org) или [ImageMagick](http://www.imagemagick.org). При использовании GraphicsMagick в начале файла `img.js` необходимо изменить `var gm = require('gm').subClass({ imageMagick: true });` на `var gm = require('gm');`.

### Установка npm-модулей

Перед установкой npm-модулей необходимо установить [nodejs](http://nodejs.org).
Из корневой директории проекта используйте npm:

```
npm i
```

### Использование

Из корневой директории запустить файл `app.js`:

```
node app.js
```

Доступны следующие пути:

* / - выводит форму для загрузки картинок
* /all - выводит все записи содержащиеся в базе `upload_images`
* /upload - директория доступная для публичного доступа
* /img/{id|name} - выводит картинку соответствующую параметрам из базы `id` или `name`
* /img/{id|name}?crop&x1={number}&y1={number}&x2={number}&y2={number} - выводит обрезанную картинку соответствующую параметрам базы `id` или `name` (crop - обязателный параметр в запросе; x1, y1, x2, y2 - обязательное присутствие хотябы одного числового параметра из них)