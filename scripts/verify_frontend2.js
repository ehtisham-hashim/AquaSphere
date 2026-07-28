const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'Frontend', 'src');
const featuresDir = path.join(src, 'features');
const exts = ['.js','.jsx','.ts','.tsx'];
function walkDir(dir){
  if (!fs.existsSync(dir)) return [];
  const res = [];
  for (const name of fs.readdirSync(dir)){
    const p = path.join(dir,name);
    const st = fs.statSync(p);
    if (st.isDirectory()) res.push(...walkDir(p));
    else if (st.isFile() && exts.includes(path.extname(name))) res.push(p);
  }
  return res;
}

if (!fs.existsSync(featuresDir)){
  console.error('no features dir'); process.exit(1);
}

const features = {};
for (const name of fs.readdirSync(featuresDir)){
  const fp = path.join(featuresDir,name);
  if (!fs.statSync(fp).isDirectory()) continue;
  const allFiles = walkDir(fp).map(p=>path.relative(src,p));
  const hooks = allFiles.filter(f => f.split(path.sep).includes('hooks'));
  const utils = allFiles.filter(f => f.split(path.sep).includes('utils'));
  // components: files under folder excluding hooks/utils and index files and tests
  const components = allFiles.filter(f=> !f.split(path.sep).includes('hooks') && !f.split(path.sep).includes('utils') && !f.endsWith('index.js') && !f.endsWith('index.jsx') && !f.endsWith('.test.js') );
  features[name]={
    totalFiles: allFiles.length,
    components: components.length,
    hooks: hooks.length,
    utils: utils.length,
    sampleComponents: components.slice(0,20)
  };
}
console.log(JSON.stringify(features,null,2));
