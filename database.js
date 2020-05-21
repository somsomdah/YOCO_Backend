var mongoose=require('mongoose')
var database={}

database.init=function(app,config){
    console.log('init() called')
    connect(app,config)
}


// 데이터베이스 연결
function connect(app,config){
    console.log('connect() called')
    mongoose.Promise=global.Promise;
    mongoose.connect(config.db_url, {useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false}); // 데이터베이스 연결정보를 파라미터로 넘겨줌
    database.db=mongoose.connection // mongoose의 connection 객체로 전달되는 이벤트를 통해 데이터베이스에 연결되었는지 여부를 알 수 있다.

    database.db.on('error',console.error.bind(console,'mongoose connection error')) // 연결 에러
    database.db.on('open',function(){console.log('connected to database.db')})
    database.db.on('dinsconnected',connect) // 연결 안됐을 때
    createSchema(app,config)
}



// 스키마 생성
function createSchema(app,config,createData=false){

    var schemaLen=config.db_schemas.length;

    for (var i=0; i<schemaLen; ++i) {

        var curItem=config.db_schemas[i];//스키마 불러옴
        var curSchema=require(curItem.file)[curItem.schemaName]// 모듈 파일에서 불러온 후 사용
        var curModel=mongoose.model(curItem.collection,curSchema) // 지정할 테이블 이름, 사용할 스키마 ->데이터베이스 등록
    

        if (createData){

            
            if (curItem.collection=='users'){
                var user=new Array();
                var car=new Array();
                user[0]=new curModel({"user_id":"user00","user_password":"pass00","renting":false}); user[0].save(function(err){if (err) throw err;});
                user[1]=new curModel({"user_id":"user01","user_password":"pass01","renting":false}); user[1].save(function(err){if (err) throw err;});
                user[2]=new curModel({"user_id":"user02","user_password":"pass02","renting":false}); user[2].save(function(err){if (err) throw err;});
                console.log('users item added')
            }

            if (curItem.collection=='cars'){
                var car=new Array();
                car[0]=new curModel({"car_id":"c0001","car_type":"compact","on_rent":false}); car[0].save(function(err){if (err) throw err;});
                car[1]=new curModel({"car_id":"c0002","car_type":"compact","on_rent":false}); car[1].save(function(err){if (err) throw err;});
                car[2]=new curModel({"car_id":"m0001","car_type":"midsize","on_rent":false}); car[2].save(function(err){if (err) throw err;});
                car[3]=new curModel({"car_id":"m0002","car_type":"midsize","on_rent":false}); car[3].save(function(err){if (err) throw err;});
                car[4]=new curModel({"car_id":"f0001","car_type":"fullsize","on_rent":false}); car[4].save(function(err){if (err) throw err;});
                car[5]=new curModel({"car_id":"f0002","car_type":"fullsize","on_rent":false}); car[5].save(function(err){if (err) throw err;});
                console.log('cars item added')
            }

        }

        database[curItem.schemaName]=curSchema;
        database[curItem.modelName]=curModel;

    }
    console.log(database)
    app.set('database',database);// database객체가 app객체의 속성으로 추가됨
}


module.exports=database
