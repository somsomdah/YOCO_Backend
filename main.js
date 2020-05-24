var express = require('express')
	, http = require('http')
var bodyParser = require('body-parser')
	, cookieParser = require('cookie-parser')
	, errorHandler = require('errorhandler');
var expressErrorHandler = require('express-error-handler');
var expressSession = require('express-session');
var multipart = require('multiparty');


var config = require('./config'); // 모듈로 분리한 설정 파일 불러오기
var database = require('./database'); // 모듈로 분리한 데이터베이스 파일 불러오기

var app = express(); // 익스프레스 객체 생성
app.use(cookieParser());
app.use(expressSession({ secret: 'my key', resave: true, saveUninitialized: true }));


var app = express(); // 익스프레스 객체 생성
var router = express.Router()

console.log('config.server_port : %d', config.server_port);
app.set('port', process.env.PORT || config.server_port);
app.set('database', database)
app.set('router', router)

for (var i = 0; i < config.route_info.length; i++) {
	var curItem = config.route_info[i];

	var curModule = require(curItem.file);
	console.log('read module info from %s, method : %s ', curItem.file, curItem.method);

	if (curItem.type == 'get') {
		router.route(curItem.path).get(curModule[curItem.method]);
	} else if (curItem.type == 'post') {
		router.route(curItem.path).post(curModule[curItem.method]);
	} else {
		router.route(curItem.path).post(curModule[curItem.method]);
	}
}

router.route('/test').post(function (req, res) {

	if (database.db) {
		var form = new multipart.Form();

		form.parse(req, function (err, fields, files) {
			console.log(files)
			console.log(fields)

			var rent_id = fields.rent_id[0]
			var before_after = fields.before_after[0]
			const pythonshell = require('python-shell')
			const fs = require('fs')

			database.PhotoModel.find({ "rent_id": rent_id, "before_after": before_after }, function (err, results) {

				if (err) {
					console.log("runYoloPy : " + err)
					res.send({ result: false });
				} else if (results.length > 0) {

					function sleep(log, sec) {
						return new Promise(function (resolve, reject) {
							setTimeout(function () {
								console.log(log);
								resolve();
							}, sec);
						});
					}

					function runyolo(part, timeout) {
						return new Promise(resolve =>
							setTimeout(() => {

								var extention = "jpg";
								var filename = rent_id + "_" + part + '_' + before_after + '.' + extention
								var options = { mode: 'text', pythonPath: "", pythonOptions: ['-W ignore'], scriptPath: '', args: [before_after, filename] };

								pythonshell.PythonShell.run('yolo.py', options, function (err, results) {
									if (err) {
										console.log("runYoloPy : " + err);
									}

									console.log("runYoloPy : python process running ...")

									var resultpath = './results/yolo/' + filename.split('.').slice(0)[0] + '.json';

									let rawdata = fs.readFileSync(resultpath);
									let yoloresult = JSON.parse(rawdata);

									database.PhotoModel.findOneAndUpdate({ "rent_id": rent_id, "before_after": before_after, "part": part },
										{ $set: { 'defects': yoloresult.predictions } },
										() => {
											console.log("runYoloPy : yolo result saved in database")
										})

								});
								resolve();
							}, timeout));
					}

					async function loop() {

						for (part of ['ff', 'ft', 'bf', 'bt', 'lf', 'lb', 'rf', 'rb']) {
							if (part == 'ff') {
								await runyolo(part, 10);
							} else {
								await (runyolo(part, 18000))
							}
						}

						await sleep("runYoloPy : yolo process completed", 18000)
						await res.send({ "result": true })

					}
					loop();

				} else {
					console.log("runYoloPy : photos not found")
					res.send({ result: false });
				}
			})
		}) 
	}else {
		console.log("database disconected")
		res.send({ result: false });
	}

	
})


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: "10000mb", parameterLimit: 1000000 }));
app.use('/', router)

var errorHandler = expressErrorHandler();
app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);


// 프로세스 종료 시에 데이터베이스 연결 해제
process.on('SIGTERM', function () {
	console.log("terminate process");
	app.close();
});

app.on('close', function () {
	console.log("terminate express server");
	if (database.db) {
		database.db.close();
	}
});

// Express 서버 시작
http.createServer(app).listen(app.get('port'), function () {
	console.log('server started. port : ' + app.get('port'));

	// 데이터베이스 초기화
	database.init(app, config);
	console.log(database)

});
