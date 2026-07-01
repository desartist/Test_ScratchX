import { connectDB } from "@/lib/connectDB.js";
import User from "@/models/userModel.js";
export async function GET() {
  const db = await connectDB();
  const users = await User.find();
  return Response.json(
    users.map((user) => {
      return {
        id: user._id,
        name: user.name,
        phone: user.phone,
        billAmount: user.billAmount,
        campaignId: user.campaignId,
        couponWon: user.couponWon,
      };
    }),
    { status: 200 },
  );
}

export async function POST(request) {
  const db = await connectDB();
  const newUser = request.json();
  const user = await User.create({
    name: newUser.name,
    phone: newUser.phone,
    billAmount: newUser.billAmount,
    campaignId: newUser.campaignId,
    couponWon: {
      code: newUser.couponWon.code,
      discount: newUser.couponWon.discount,
    },
  });
  console.log("POST request");
  return Response.json({ user: user }, { status: 201 });
}

export async function PUT(request, { params }) {
  const db = await connectDB();
  const { id } = params;
  const updatedUser = request.json();
  const user = await User.findByIdAndUpdate(id, updatedUser, {
    new: true,
    runValidators: true,
  });
  console.log("PUT request");
  return Response.json({ user: user }, { status: 200 });
}

export async function DELETE(_, { params }) {
  const db = await connectDB();
  const { id } = params;
  const user = await User.findByIdAndDelete(id);
  console.log("DELETE request");
  return Response.json({ user: user }, { status: 200 });
}
