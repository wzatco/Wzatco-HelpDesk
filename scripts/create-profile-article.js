// Script to create the Profile Information Knowledge Base article
// Run with: node scripts/create-profile-article.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createProfileArticle() {
  try {
    // Check if article already exists
    const existing = await prisma.article.findUnique({
      where: { slug: 'profile-information' }
    });

    if (existing) {
      console.log('✅ Article "Profile Information" already exists!');
      return;
    }

    // Create the article
    const article = await prisma.article.create({
      data: {
        title: 'Profile Information',
        slug: 'profile-information',
        content: `
          <h2>Understanding Your Profile</h2>
          <p>Your profile is your identity in the system. It contains important information that helps other team members and administrators understand who you are and how to contact you.</p>
          
          <h3>Profile Fields</h3>
          <ul>
            <li><strong>Name:</strong> Your full name (First Name and Last Name are required)</li>
            <li><strong>Email:</strong> Your contact email address (required)</li>
            <li><strong>Phone:</strong> Your primary phone number with country code</li>
            <li><strong>Mobile:</strong> Your mobile phone number with country code</li>
            <li><strong>About:</strong> A brief bio or description about yourself</li>
            <li><strong>Profile Picture:</strong> Your avatar image (max 2MB, JPG/PNG/GIF formats)</li>
          </ul>
          
          <h3>For Agents</h3>
          <ul>
            <li><strong>Department:</strong> The department you belong to (required)</li>
            <li><strong>Role and Permission:</strong> Your assigned role (read-only, set by administrator)</li>
            <li><strong>Status:</strong> Whether you are Active or Inactive</li>
            <li><strong>Channel Expert:</strong> Your areas of expertise (e.g., Email, Chat, Phone). Add multiple channels by pressing Enter after each one.</li>
          </ul>
          
          <h3>Editing Your Profile</h3>
          <p>To edit your profile:</p>
          <ol>
            <li>Click the "Edit" button on your profile page</li>
            <li>Update any fields you want to change</li>
            <li>Click "Update" to save your changes</li>
            <li>Click "Cancel" to discard changes</li>
          </ol>
          
          <h3>Profile Picture Guidelines</h3>
          <ul>
            <li>Maximum file size: 2MB</li>
            <li>Supported formats: JPG, PNG, GIF, JPEG</li>
            <li>Recommended size: 200x200 pixels or larger (square images work best)</li>
          </ul>
          
          <h3>Phone Number Format</h3>
          <p>When entering phone numbers:</p>
          <ul>
            <li>Select your country code from the dropdown (default: +91 for India)</li>
            <li>Enter your phone number (digits only)</li>
            <li>The system will automatically format it as: [Country Code] [Phone Number]</li>
          </ul>
          
          <h3>Need Help?</h3>
          <p>If you have questions about your profile or need assistance updating your information, please contact your administrator.</p>
        `,
        contentType: 'richtext',
        status: 'published',
        isPublic: true,
        createdByName: 'System',
        tags: JSON.stringify(['profile', 'settings', 'user-guide'])
      }
    });

    console.log('✅ Article "Profile Information" created successfully!');
    console.log(`   Slug: ${article.slug}`);
    console.log(`   URL: /knowledge-base/${article.slug}`);
  } catch (error) {
    console.error('❌ Error creating article:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createProfileArticle();

