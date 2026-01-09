const mongoose  =  require("mongoose");
const EventSchema = new mongoose.Schema ({
    event_id : {
        type:String,
        required:true,
        unique:true
    },
    event_type :{
         type : String,
         required : true,
    },
    platform :{
        type:String,
        required:true,
    },
    actor_id :{
        tyoe:String,
        required : trusted
    },
    timestamp :{
        type:Date,
        required:true,
    },

    payload :{
        type:mongoose.Schema.Types.Mixed,
        required: true,
    },
    timestamp :{
        createdAt: "ingested_at",
        updatedAt:false,
    },
    versionkey :false,
}) 
module.exports = mongoose.model("Event",EventSchema)