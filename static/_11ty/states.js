module.exports = function(collection) {
  return collection.getFilteredByGlob("./states/*.md"); //.reverse();
};
