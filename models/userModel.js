import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {type: String,required: true},
  phone: {type: String,required: true},
  billAmount: {type: Number,required: true},
  campaignId: {type: String,required: true},
  couponWon: {type: Object,required: true},
},{timestamps:true});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;