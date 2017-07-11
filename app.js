   var express = require('express');
   var app = express();
   var bodyParser = require('body-parser');
   var mongoose = require('mongoose');
   mongoose.connect('mongodb://localhost:27017/cloudstorage');
   var conn = mongoose.connection;
   var multer = require('multer');
   var GridFsStorage = require('multer-gridfs-storage');
   var Grid = require('gridfs-stream');
   Grid.mongo = mongoose.mongo;
   var gfs = Grid(conn.db);
   var{addtag} = require('./middleware/tag');
   var {ObjectID} = require('mongodb');

   /** Seting up server to accept cross-origin browser requests */
  //  app.use(function(req, res, next) { //allow cross origin requests
  //      res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
  //      res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  //      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  //      res.header("Access-Control-Allow-Credentials", true);
  //      next();
  //  });
   app.set('views', './htmlpublic')
   app.set('view engine', 'pug');

   app.use(bodyParser.json());

   /** Setting up storage using multer-gridfs-storage */
   var storage = GridFsStorage({
       gfs : gfs,
       //_id : new ObjectID(),
       filename: function (req, files, cb) {
          //  var datetimestamp = Date.now();
          //  cb(null, files.fieldname + '-' + datetimestamp + '.' + files.originalname.split('.')[files.originalname.split('.').length -1]);
          cb(null,files.originalname);
       },
       /** With gridfs we can store aditional meta-data along with the file */
       metadata: function(req, files, cb) {
           cb(null, { //originalname: files.originalname,
             tag: req.tag
           });
       },
       root: 'ctFiles' //root name for collection to store files into
   });

   var upload = multer({ //multer settings for multiple upload
       storage: storage
   }).array('file');

   /** API path that will upload the files */
   app.post('/upload/:tag',addtag, function(req, res) {
       upload(req,res,function(err){
           if(err){
                return res.status(400).send(err);
           }
           console.log(req);
           let files = req.files;
           let data= [];
           for(let i =0;i<files.length;i++){
             var sendObj = {
               filename: files[i].filename,
               id: files[i].id
             };
             data.push(sendObj);
           }
           res.send(data);
       });
   });

   app.get('/download/file/:id', function(req, res){
       gfs.collection('ctFiles'); //set collection name to lookup into
       var id = req.params.id.toString();
       if(!ObjectID.isValid(id)) return res.status(404).send();
       /** First check if file exists */
       gfs.files.find({_id: new ObjectID(id)}).toArray(function(err, files){
           if(!files || files.length === 0){
              return res.status(404).send(err);
           }
           /** create read stream */
           var readstream = gfs.createReadStream({
              // filename: files[0].filename,
              root: "ctFiles",
              _id: id
           });
           /** set the proper content type */
           res.set('Content-Type', files[0].contentType)
           res.set("Content-Disposition", "attachment; filename=\"" + files[0].filename +"\"")
           /** return response */
           readstream.pipe(res);
       });
   });

   app.get('/download/tag/:tag', function(req, res){
       gfs.collection('ctFiles'); //set collection name to lookup into
       /** First check if file exists */
       gfs.files.find({"metadata.tag": req.params.tag}).toArray(function(err, files){
           if(!files || files.length === 0){
              return res.status(404).send(err);
           }
           var data = [];
           for(var i = 0;i <files.length;i++){
             var sendObj = {
               filename: files[i].filename,
               _id: files[i]._id
             };
             data.push(sendObj);
           }
           /** set the proper content type */
           res.set('Content-Type', 'application/json');
           res.send(data);
       });
   });

   app.listen('3000', function(){
       console.log('Express listening on port 3000');
   });
