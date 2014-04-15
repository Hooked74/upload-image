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
    }
});

exports.Image = mongoose.model('Image', Image);
