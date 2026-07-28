const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'Frontend', 'src');

const exts = ['.js','.jsx','.ts','.tsx'];
function existsWithExt(p) {
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  for (const e of exts) {
    if (fs.existsSync(p + e)) return p + e;
  }
  // index files
  for (const e of exts) {
    if (fs.existsSync(path.join(p, 'index' + e))) return path.join(p, 'index' + e);
  }
  return null;
}

function walk(dir) {
  const items = [];
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) items.push(...walk(fp));
    else if (st.isFile() && exts.includes(path.extname(name))) items.push(fp);
  }
  return items;
}

if (!fs.existsSync(src)) {
  console.error('Frontend/src not found at', src);
  process.exit(2);
}

// Step 1: list feature folders
const featuresDir = path.join(src, 'features');
let featureFolders = [];
if (fs.existsSync(featuresDir)) {
  featureFolders = fs.readdirSync(featuresDir).filter(n => {
    const p = path.join(featuresDir, n);
    return fs.statSync(p).isDirectory();
  });
}

const features = {};
for (const f of featureFolders) {
  const fp = path.join(featuresDir, f);
  const compsDir = path.join(fp, 'components');
  const hooksDir = path.join(fp, 'hooks');
  const utilsDir = path.join(fp, 'utils');
  const components = fs.existsSync(compsDir) ? walk(compsDir) : [];
  const hooks = fs.existsSync(hooksDir) ? walk(hooksDir) : [];
  const utils = fs.existsSync(utilsDir) ? walk(utilsDir) : [];
  features[f] = {
    folder: fp,
    componentsCount: components.length,
    hooksCount: hooks.length,
    utilsCount: utils.length,
    componentsFiles: components.map(p=>path.relative(src,p)),
    hooksFiles: hooks.map(p=>path.relative(src,p)),
    utilsFiles: utils.map(p=>path.relative(src,p)),
  };
}

// gather all source files
const files = walk(src).map(f=>path.relative(src,f));
const fileAbs = walk(src);

// parse imports
const importRegex = /import\s+(?:.+?)\s+from\s+['"](.+?)['"];?/g;
const requireRegex = /require\(['"](.+?)['"]\)/g;

const imports = {};
for (let i=0;i<fileAbs.length;i++){
  const f = fileAbs[i];
  const rel = path.relative(src,f);
  const txt = fs.readFileSync(f,'utf8');
  imports[rel] = [];
  let m;
  while((m=importRegex.exec(txt))!==null){ imports[rel].push(m[1]); }
  while((m=requireRegex.exec(txt))!==null){ imports[rel].push(m[1]); }
}

// resolve relative imports and detect missing
const missing = [];
const edges = {};
for (const [file, imps] of Object.entries(imports)){
  edges[file]=[];
  const dir = path.dirname(path.join(src,file));
  for (const imp of imps){
    if (imp.startsWith('.') ){
      const targetPath = path.resolve(dir, imp);
      const found = existsWithExt(targetPath);
      if (!found){
        missing.push({file, imp, lookedAt: [targetPath, targetPath + '.js', targetPath + '.jsx', targetPath + '.ts', targetPath + '.tsx'].slice(0,5)});
      } else {
        const relFound = path.relative(src, found);
        edges[file].push(relFound);
      }
    }
  }
}

// detect cycles via DFS
const visited = {};
const onstack = {};
const cycles = [];
function dfs(node, stack){
  if (onstack[node]){
    const idx = stack.indexOf(node);
    cycles.push(stack.slice(idx).concat(node));
    return;
  }
  if (visited[node]) return;
  visited[node]=true;
  onstack[node]=true;
  stack.push(node);
  for (const to of (edges[node]||[])) dfs(to, stack);
  stack.pop();
  onstack[node]=false;
}
for (const n of Object.keys(edges)) dfs(n, []);

// duplicate filenames
const nameMap = {};
for (const f of files){
  const base = path.basename(f);
  nameMap[base] = nameMap[base] || [];
  nameMap[base].push(f);
}
const duplicates = Object.entries(nameMap).filter(([,arr])=>arr.length>1).map(([name,arr])=>({name,occurrences:arr}));

// empty files
const emptyFiles = [];
for (const f of fileAbs){
  const txt = fs.readFileSync(f,'utf8');
  if (txt.trim().length===0) emptyFiles.push(path.relative(src,f));
}

// orphan files: files with no incoming edges and not an entry
const incoming = {};
for (const f of files) incoming[f]=0;
for (const [k,outs] of Object.entries(edges)){
  for (const o of outs) if (incoming[o]!==undefined) incoming[o]++;
}
const entryCandidates = new Set(['main.jsx','main.js','App.jsx','App.js','index.jsx','index.js']);
const orphans = Object.entries(incoming).filter(([f,c])=>c===0 && ![...entryCandidates].some(e=>f.endsWith(e)) && !f.startsWith('pages/')).map(([f])=>f);

// produce summary
const summary = {
  featureFolders: Object.keys(features).map(k=>({name:k,...features[k]})),
  totalFiles: files.length,
  missingImports: missing,
  cycles: cycles,
  duplicateFilenames: duplicates,
  emptyFiles: emptyFiles,
  orphanFiles: orphans
};

console.log(JSON.stringify(summary,null,2));
