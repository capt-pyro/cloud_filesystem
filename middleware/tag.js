var addtag = (req,res,next) => {
  var tag = req.params.tag;
  req.tag = tag;
  next();
}

module.exports = {addtag};
