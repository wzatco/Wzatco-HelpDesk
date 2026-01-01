# PowerShell script to fix the Agent table in SQLite database

$dbPath = ".\prisma\dev.db"
$sqlPath = ".\prisma\migrations\20251127000000_add_missing_agent_fields\migration.sql"

Write-Host "Checking if database exists..." -ForegroundColor Cyan
if (-not (Test-Path $dbPath)) {
    Write-Host "Error: Database file not found at $dbPath" -ForegroundColor Red
    exit 1
}

Write-Host "Database found!" -ForegroundColor Green
Write-Host "Checking if migration file exists..." -ForegroundColor Cyan

if (-not (Test-Path $sqlPath)) {
    Write-Host "Error: Migration file not found at $sqlPath" -ForegroundColor Red
    exit 1
}

Write-Host "Migration file found!" -ForegroundColor Green
Write-Host ""
Write-Host "Attempting to apply migration using Prisma..." -ForegroundColor Cyan
Write-Host ""

# Try using Node.js with Prisma
$nodeScript = @"
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function fixDatabase() {
  try {
    console.log('Testing if accountId column exists...');
    
    try {
      await prisma.`$queryRaw``SELECT id, accountId FROM Agent LIMIT 1``;
      console.log('SUCCESS: accountId column already exists!');
      process.exit(0);
    } catch (error) {
      if (error.message.includes('accountId')) {
        console.log('ERROR: accountId column is missing');
        console.log('Reading migration file...');
        
        const sql = fs.readFileSync('$($sqlPath.Replace('\', '/'))', 'utf8');
        console.log('Executing migration...');
        
        await prisma.`$executeRawUnsafe(sql);
        console.log('SUCCESS: Migration applied!');
        
        // Verify
        await prisma.`$queryRaw``SELECT id, accountId FROM Agent LIMIT 1``;
        console.log('SUCCESS: Verification passed!');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.`$disconnect();
  }
}

fixDatabase();
"@

$nodeScript | Out-File -FilePath "temp-fix-db.js" -Encoding UTF8

Write-Host "Running database fix script..." -ForegroundColor Yellow
node temp-fix-db.js

$exitCode = $LASTEXITCODE
Remove-Item "temp-fix-db.js" -ErrorAction SilentlyContinue

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "Database fix completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Database fix failed with exit code: $exitCode" -ForegroundColor Red
}

exit $exitCode

