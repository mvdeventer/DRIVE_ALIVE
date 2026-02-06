const fs = require('fs');

const filePath = 'frontend/screens/admin/UserManagementScreen.tsx';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Count corrupted before
let before = content.match(/ðŸ|âœ|â|💰|âš/g)?.length || 0;
console.log(`Found ${before} corrupted emoji patterns before fixing`);

// Direct string replacements - copy the actual corrupted text from the file
let fixes = 0;

// User emoji fix (admin tab)
const userCount = (content.match(/ðŸ'¤/g) || []).length;
if (userCount > 0) {
  content = content.replace(/ðŸ'¤/g, '👤');
  fixes += userCount;
  console.log(`Fixed ${userCount} user emojis (👤)`);
}

// Books emoji (student tab)
const booksCount = (content.match(/ðŸ"š/g) || []).length;
if (booksCount > 0) {
  content = content.replace(/ðŸ"š/g, '📚');
  fixes += booksCount;
  console.log(`Fixed ${booksCount} books emojis (📚)`);
}

// Pencil emoji (edit button)
const pencilCount = (content.match(/âœï¸/g) || []).length;
if (pencilCount > 0) {
  content = content.replace(/âœï¸/g, '✏️');
  fixes += pencilCount;
  console.log(`Fixed ${pencilCount} pencil emojis (✏️)`);
}

// Key emoji (reset password)
const keyCount = (content.match(/ðŸ"'/g) || []).length;
if (keyCount > 0) {
  content = content.replace(/ðŸ"'/g, '🔑');
  fixes += keyCount;
  console.log(`Fixed ${keyCount} key emojis (🔑)`);
}

// Wastebasket emoji (delete)  
const binCount = (content.match(/ðŸ—'ï¸/g) || []).length;
if (binCount > 0) {
  content = content.replace(/ðŸ—'ï¸/g, '🗑️');
  fixes += binCount;
  console.log(`Fixed ${binCount} wastebasket emojis (🗑️)`);
}

// Calendar emoji
const calCount = (content.match(/ðŸ"…/g) || []).length;
if (calCount > 0) {
  content = content.replace(/ðŸ"…/g, '📅');
  fixes += calCount;
  console.log(`Fixed ${calCount} calendar emojis (📅)`);
}

// Cross mark emoji
const crossCount = (content.match(/âŒ/g) || []).length;
if (crossCount > 0) {
  content = content.replace(/âŒ/g, '❌');
  fixes += crossCount;
  console.log(`Fixed ${crossCount} cross mark emojis (❌)`);
}

// Warning emoji  
const warnCount = (content.match(/âš ï¸/g) || []).length;
if (warnCount > 0) {
  content = content.replace(/âš ï¸/g, '⚠️');
  fixes += warnCount;
  console.log(`Fixed ${warnCount} warning emojis (⚠️)`);
}

// Reload emoji
const reloadCount = (content.match(/ðŸ"„/g) || []).length;
if (reloadCount > 0) {
  content = content.replace(/ðŸ"„/g, '🔄');
  fixes += reloadCount;
  console.log(`Fixed ${reloadCount} reload emojis (🔄)`);
}

// Prohibited emoji
const prohibCount = (content.match(/ðŸš«/g) || []).length;
if (prohibCount > 0) {
  content = content.replace(/ðŸš«/g, '🚫');
  fixes += prohibCount;
  console.log(`Fixed ${prohibCount} prohibited emojis (🚫)`);
}

// Telephone emoji
const phoneCount = (content.match(/ðŸ"ž/g) || []).length;
if (phoneCount > 0) {
  content = content.replace(/ðŸ"ž/g, '📞');
  fixes += phoneCount;
  console.log(`Fixed ${phoneCount} telephone emojis (📞)`);
}

// ID emoji
const idCount = (content.match(/ðŸ†"/g) || []).length;
if (idCount > 0) {
  content = content.replace(/ðŸ†"/g, '🆔');
  fixes += idCount;
  console.log(`Fixed ${idCount} ID emojis (🆔)`);
}

// Eye emoji
const eyeCount = (content.match(/ðŸ'ï¸/g) || []).length;
if (eyeCount > 0) {
  content = content.replace(/ðŸ'ï¸/g, '👁️');
  fixes += eyeCount;
  console.log(`Fixed ${eyeCount} eye emojis (👁️)`);
}

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ Successfully fixed ${fixes} emoji encodings in UserManagementScreen.tsx`);
