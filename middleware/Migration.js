// Database Migration Script
// Run this once to convert old object-format file data to string format

const mongoose = require('mongoose');
const UserForm = require('./model/formModel'); // Adjust path as needed

const migrateFileData = async () => {
  try {
    console.log('🔍 Starting file data migration...');
    
    // Find all registrations with object-type file fields
    const registrations = await UserForm.find({
      $or: [
        { aadharFile: { $type: 'object', $ne: null } },
        { signatureFile: { $type: 'object', $ne: null } }
      ]
    });
    
    console.log(`📊 Found ${registrations.length} registrations with object-format file data`);
    
    let migratedCount = 0;
    let errors = [];
    
    for (const registration of registrations) {
      try {
        console.log(`\n🔄 Processing registration: ${registration._id}`);
        console.log(`   Name: ${registration.firstName} ${registration.lastName}`);
        
        let updateData = {};
        let hasUpdates = false;
        
        // Handle aadharFile conversion
        if (registration.aadharFile && typeof registration.aadharFile === 'object') {
          console.log('   📄 Converting aadharFile object to string...');
          console.log('   Current aadharFile:', JSON.stringify(registration.aadharFile, null, 2));
          
          let newAadharPath = null;
          
          // Try different object properties to extract file path
          if (registration.aadharFile.path) {
            newAadharPath = registration.aadharFile.path;
          } else if (registration.aadharFile.filename) {
            newAadharPath = `uploads/aadhar/${registration.aadharFile.filename}`;
          } else if (registration.aadharFile.originalname) {
            newAadharPath = `uploads/aadhar/${registration.aadharFile.originalname}`;
          }
          
          if (newAadharPath) {
            updateData.aadharFile = newAadharPath;
            hasUpdates = true;
            console.log('   ✅ New aadharFile path:', newAadharPath);
          } else {
            console.log('   ⚠️  Could not extract aadharFile path from object');
          }
        }
        
        // Handle signatureFile conversion
        if (registration.signatureFile && typeof registration.signatureFile === 'object') {
          console.log('   📄 Converting signatureFile object to string...');
          console.log('   Current signatureFile:', JSON.stringify(registration.signatureFile, null, 2));
          
          let newSignaturePath = null;
          
          // Try different object properties to extract file path
          if (registration.signatureFile.path) {
            newSignaturePath = registration.signatureFile.path;
          } else if (registration.signatureFile.filename) {
            newSignaturePath = `uploads/signature/${registration.signatureFile.filename}`;
          } else if (registration.signatureFile.originalname) {
            newSignaturePath = `uploads/signature/${registration.signatureFile.originalname}`;
          }
          
          if (newSignaturePath) {
            updateData.signatureFile = newSignaturePath;
            hasUpdates = true;
            console.log('   ✅ New signatureFile path:', newSignaturePath);
          } else {
            console.log('   ⚠️  Could not extract signatureFile path from object');
          }
        }
        
        // Update the registration if we have changes
        if (hasUpdates) {
          await UserForm.findByIdAndUpdate(registration._id, updateData);
          migratedCount++;
          console.log('   ✅ Registration updated successfully');
        } else {
          console.log('   ℹ️  No updates needed for this registration');
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing registration ${registration._id}:`, error.message);
        errors.push({
          registrationId: registration._id,
          name: `${registration.firstName} ${registration.lastName}`,
          error: error.message
        });
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Total registrations processed: ${registrations.length}`);
    console.log(`   Successfully migrated: ${migratedCount}`);
    console.log(`   Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => {
        console.log(`   - ${error.name} (${error.registrationId}): ${error.error}`);
      });
    }
    
    console.log('\n✅ Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Dry run function - shows what would be changed without actually changing it
const dryRunMigration = async () => {
  try {
    console.log('🔍 DRY RUN - Checking what would be migrated...');
    
    const registrations = await UserForm.find({
      $or: [
        { aadharFile: { $type: 'object', $ne: null } },
        { signatureFile: { $type: 'object', $ne: null } }
      ]
    });
    
    console.log(`📊 Found ${registrations.length} registrations with object-format file data`);
    
    for (const registration of registrations) {
      console.log(`\n📋 Registration: ${registration._id}`);
      console.log(`   Name: ${registration.firstName} ${registration.lastName}`);
      
      if (registration.aadharFile && typeof registration.aadharFile === 'object') {
        console.log('   📄 aadharFile (object):', JSON.stringify(registration.aadharFile, null, 2));
        
        let proposedPath = null;
        if (registration.aadharFile.path) {
          proposedPath = registration.aadharFile.path;
        } else if (registration.aadharFile.filename) {
          proposedPath = `uploads/aadhar/${registration.aadharFile.filename}`;
        }
        
        console.log('   🔄 Would convert to:', proposedPath || 'COULD NOT DETERMINE');
      }
      
      if (registration.signatureFile && typeof registration.signatureFile === 'object') {
        console.log('   📄 signatureFile (object):', JSON.stringify(registration.signatureFile, null, 2));
        
        let proposedPath = null;
        if (registration.signatureFile.path) {
          proposedPath = registration.signatureFile.path;
        } else if (registration.signatureFile.filename) {
          proposedPath = `uploads/signature/${registration.signatureFile.filename}`;
        }
        
        console.log('   🔄 Would convert to:', proposedPath || 'COULD NOT DETERMINE');
      }
    }
    
    console.log('\n✅ Dry run completed - no data was changed');
    
  } catch (error) {
    console.error('❌ Dry run failed:', error);
  }
};

// Export functions
module.exports = {
  migrateFileData,
  dryRunMigration
};

// If running this file directly
if (require.main === module) {
  console.log('🚀 Database Migration Tool');
  console.log('Usage:');
  console.log('  node migration.js dry-run    # Preview changes');
  console.log('  node migration.js migrate    # Perform migration');
  
  const command = process.argv[2];
  
  if (command === 'dry-run') {
    dryRunMigration().then(() => process.exit(0));
  } else if (command === 'migrate') {
    migrateFileData().then(() => process.exit(0));
  } else {
    console.log('Please specify either "dry-run" or "migrate"');
    process.exit(1);
  }
}