const mongoose = require("mongoose")


const conection = async ()=>{
    try{
        await mongoose.connect("mongodb+srv://admin:admin@cluster0.xxyp4j3.mongodb.net/universidad?retryWrites=true&w=majority");
        //await mongoose.connect("mongodb+srv://admin1:admin1@cluster0.xxyp4j3.mongodb.net/universidad?retryWrites=true&w=majority&appName=Cluster0");

        //await mongoose.connect("mongodb+srv://didier123:didier123@cluster0.8rkv12o.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0");
        console.log("base de datos conectada");

    }
    catch(error){
        console.log("el error es: ",error);
        throw new Error("no se pudo conectar a la base de datos");
    }
}


module.exports = conection;