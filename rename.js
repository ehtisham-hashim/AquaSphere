const fs = require('fs');

const files = [
  "/home/ehtisham/Desktop/Projects/AquaSphere/AQUA_Sphere_OS_Master_Requirements.md",
  "/home/ehtisham/Desktop/Projects/AquaSphere/backend/prisma/wadaana-models.prisma",
  "/home/ehtisham/Desktop/Projects/AquaSphere/backend/scripts/generate-schema.js",
  "/home/ehtisham/Desktop/Projects/AquaSphere/backend/src/middleware/context.middleware.js",
  "/home/ehtisham/Desktop/Projects/AquaSphere/context/architecture.md",
  "/home/ehtisham/Desktop/Projects/AquaSphere/context/design.md",
  "/home/ehtisham/Desktop/Projects/AquaSphere/context/optimization.md",
  "/home/ehtisham/Desktop/Projects/AquaSphere/context/project-requirements.md",
  "/home/ehtisham/Desktop/Projects/AquaSphere/context/rules.md"
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/Badana/g, 'Wadaana');
    content = content.replace(/badana/g, 'wadaana');
    content = content.replace(/BADANA/g, 'WADAANA');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
