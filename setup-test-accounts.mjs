import mongoose from 'mongoose';

// Inline Account schema since we need to connect separately
const accountSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  role: String,
  status: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  parentId: mongoose.Schema.Types.ObjectId,
  profile: mongoose.Schema.Types.Mixed,
}, { strict: false });

const Account = mongoose.model('Account', accountSchema, 'accounts');

async function setupAccounts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ScratchX');
    console.log('Connected to MongoDB');
    
    // Get test accounts
    const distributor = await Account.findOne({ email: 'distributor@test.com' });
    const merchant = await Account.findOne({ email: 'merchant@test.com' });
    const manager = await Account.findOne({ email: 'manager@test.com' });
    
    if (!distributor || !merchant || !manager) {
      console.error('Missing test accounts');
      process.exit(1);
    }
    
    console.log('Found accounts:');
    console.log(`Distributor: ${distributor._id}`);
    console.log(`Merchant: ${merchant._id}`);
    console.log(`Manager: ${manager._id}`);
    
    // Update merchant - set distributor as creator and parent
    await Account.updateOne(
      { _id: merchant._id },
      {
        $set: {
          createdBy: distributor._id,
          parentId: distributor._id,
          profile: {
            storeName: 'Test Store',
            storeLocation: 'New York',
            businessType: 'Retail'
          }
        }
      }
    );
    console.log('Updated merchant');
    
    // Update manager - set merchant as creator and parent
    await Account.updateOne(
      { _id: manager._id },
      {
        $set: {
          createdBy: merchant._id,
          parentId: merchant._id
        }
      }
    );
    console.log('Updated manager');
    
    console.log('Setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupAccounts();
