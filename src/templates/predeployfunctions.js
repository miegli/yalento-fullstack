const fs = require('fs');
const f = 'functions/package.json';
if (fs.existsSync(f)) {
  const p = require('../../../../functions/package.json');
  p.dependencies["yalento-fullstack"] = 'file:lib/yalento-fullstack';
  fs.writeFileSync(f, JSON.stringify(p));
  console.log('pre-deploy done for functions');
} else {
  console.log('functions/package.json not readable.')
  process.exit(1);
}
