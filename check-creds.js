const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCreds() {
  const settings = await prisma.settings.findFirst({
    where: { category: 'integrations' }
  });
  
  if (settings) {
    console.log('Client ID:', settings.googleClientId?.substring(0, 30) + '...');
    console.log('Client Secret:', settings.googleClientSecret?.substring(0, 10) + '...');
    console.log('Full length - ID:', settings.googleClientId?.length);
    console.log('Full length - Secret:', settings.googleClientSecret?.length);
  } else {
    console.log('No settings found');
  }
  
  await prisma.$disconnect();
}

checkCreds();
