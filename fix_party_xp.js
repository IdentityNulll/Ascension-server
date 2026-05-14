const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ascension';

async function fixPartyXP() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const Party = mongoose.connection.collection('parties');
    
    const parties = await Party.find({}).toArray();
    console.log(`Found ${parties.length} parties.`);

    for (const party of parties) {
      const totalXP = (party.members || []).reduce((sum, member) => sum + (member.xpEarned || 0), 0);
      
      await Party.updateOne(
        { _id: party._id },
        { $set: { totalPartyXP: totalXP } }
      );
      console.log(`Updated party "${party.name}": totalPartyXP = ${totalXP}`);
    }

    console.log("Fix completed successfully!");
  } catch (err) {
    console.error("Fix failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

fixPartyXP();
