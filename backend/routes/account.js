const express = require('express');
const authMiddleWare  = require('../middleware');
const {Account} = require('../db');
const zod = require('zod');
const accountRouter = express.Router();
const mongoose = require('mongoose');

accountRouter.get('/balance', authMiddleWare, async(req,res,next)=>{
    const account = await Account.findOne({userId : req.userId});
    return res.json({balance : account.balance});
});

const transferSchema = zod.object({
    to: zod.string(),
    amount: zod.string(),
})

accountRouter.post('/transfer', authMiddleWare, async (req, res, next) => {
    const session = await mongoose.startSession();
    console.log('done');
    session.startTransaction();
    const validationResult = transferSchema.safeParse(req.body);
    if (!validationResult.success) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid account" });
    }
    const { amount, to } = req.body;
    const account = await Account.findOne({ userId: req.userId });
    if (!account || account.balance < parseInt(amount)) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Insufficient balance" });
    }
    const toAccount = await Account.findOne({ userId: to }).session(session);
    if (!toAccount) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Invalid Account" });
    }
    const numAmount = parseInt(amount);
    await Account.updateOne({ userId: req.userId }, { $inc: { balance: -numAmount } }).session(session);
    await Account.updateOne({ userId: to }, { $inc: { balance: numAmount } }).session(session);
    await session.commitTransaction();
    res.json({
        message: "Transfer successful"
    });
});


module.exports = accountRouter;