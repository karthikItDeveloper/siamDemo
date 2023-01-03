const express = require('express');
const mongoose = require('mongoose');
const { Schema } = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config({
    path: 'local.env',
});

const app = express();
const port = 8083;
app.use(bodyParser.urlencoded({
    extended: true,
}));

app.use(bodyParser.json());

let dbConn = {};
if (process.env.MONGO_CONN_STRING && process.env.MONGO_DB_NAME) {
    dbConn = mongoose.createConnection(
        `${process.env.MONGO_CONN_STRING}${process.env.MONGO_DB_NAME}?authSource=admin`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    );
} else {
    console.log('ERROR: DB CONNECTION NOT INITIALISED');
}

const offerSchema = new Schema({
    _id: {
        type: Schema.ObjectId,
        auto: true,
    },
    type: Number,
    offerStartTime: Date,
    offerEndTime: Date,
    categoryId: String,
    productId: String,
    // categoryId: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'user',
    // },
    // productId: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'post',
    // },
    // itemCount: {
    //     type: Number,
    // },
}, {
    timestamps: true,
});

const getModel = async () => dbConn.models.offer || dbConn.model('offer', offerSchema);

const addService = async (params) => {
    const Model = await getModel();
    const newModelObj = new Model(params);
    const saveRecord = await newModelObj.save();
    return saveRecord;
};

const checkExist = async (params) => {
    const Model = await getModel();
    const result = await Model.findOne(params);
    return result;
};

app.post('/insert-offer', async (req, res) => {
    try {
        const { body } = req;
        const requirredParams = ['categoryId', 'type', 'offerStartTime', 'offerEndTime', 'productId'];
        const missingFields = [];
        requirredParams.forEach((param) => {
            if (!body[param]) {
                missingFields.push(` ${param}`);
            }
        });
        if (missingFields.length) {
            throw { statusCode: 404, msg: `Mandatory Fields [${missingFields}] are Missing` };
        }
        const checkParams = {
            $or: [
                {
                    offerStartTime: {
                        $gte: body.offerStartTime,
                        $lte: body.offerEndTime,
                    },
                },
                {
                    offerEndTime: {
                        $gte: body.offerStartTime,
                        $lte: body.offerEndTime,
                    },
                },
                {
                    $and: [
                        {
                            offerStartTime: {
                                $lte: body.offerStartTime,
                            },
                        },
                        {
                            offerEndTime: {
                                // $gte: body.offerStartTime,
                                $gte: body.offerEndTime,
                            },
                        },
                    ],

                },
            ],
        };
        const checkOfferExist = await checkExist(checkParams);
        if (checkOfferExist || checkOfferExist?._id) {
            throw { statusCode: 400, msg: 'Offer Already available for selected time Period' };
        }
        // res.send({
        //     message: 'success',
        // });
        const statusCode = 200;
        const details = await addService(body);
        if (!details || !details?._id) {
            throw { statusCode: 400, msg: 'Something went wrong.' };
        }
        return res.status(statusCode).json({
            statusCode, details,
        });
    } catch (error) {
        console.log('======error====>', error);
        let statusCode = error.statusCode || 500;
        const errorMsg = error.msg || 'Internal Server Error';
        return res.status(statusCode).json({
            statusCode, errorMsg
        });
    }
});


app.listen(port, () => {
    console.log(`app listening on port ${port}`)
})

