require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Reset all activation codes (isUsed = false)
  const activationResult = await db.collection('activationcodes').updateMany(
    {},
    { $set: { isUsed: false, usedAt: null } }
  );
  console.log(`✓ Reset ${activationResult.modifiedCount} activation codes`);

  // 2. Delete all chat IDs (linked accounts)
  const chatIdResult = await db.collection('chatids').deleteMany({});
  console.log(`✓ Deleted ${chatIdResult.deletedCount} chat IDs`);

  // Summary
  const pendingCodes = await db.collection('activationcodes').countDocuments({ isUsed: false });
  const linkedChats = await db.collection('chatids').countDocuments();
  console.log(`\nSummary:`);
  console.log(`- Pending activation codes: ${pendingCodes}`);
  console.log(`- Linked chat IDs: ${linkedChats}`);

  console.log('\n✓ All activations have been reset!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
