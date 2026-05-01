const fs = require('fs');

const file = 'utils/i18n.ts';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
const newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("'achievement.unlocked'")) {
    // Check if this is the SECOND time we see it in this block
    // Actually, I just noticed there is only ONE block for uk, en, de, fr
    // Wait, let's look at the grep output!
    // Line 72: ru
    // Line 212: ru
    // Line 424: uk
    // Line 633: en
    // Line 842: de
    // Line 1051: fr
    // The typescript error said there are duplicates inside uk, en, de, fr too!
    // But grep only found ONE occurrence of 'achievement.unlocked' for uk, en, de, fr?
    // Let me grep for 'achievement.first_swipe.icon'
  }
}
