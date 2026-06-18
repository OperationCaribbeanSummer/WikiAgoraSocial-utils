const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const parseObjectId = (id) => new mongoose.Types.ObjectId(id);

module.exports = { isValidObjectId, parseObjectId };