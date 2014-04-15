var mongoose = require('../libs/mongoose'),
    Schema = mongoose.Schema;

var Image = new Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    created:{
        type: Date,
        default: Date.now
    },
    size:{
        type: String,
        required: true
    },
    cropUrl:{
        type: String
    }
});

exports.Image = mongoose.model('Image', Image);
