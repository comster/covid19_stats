module.exports = function(collection) {
  return collection.getFilteredByGlob("./countries/*.md"); //.reverse();
};
