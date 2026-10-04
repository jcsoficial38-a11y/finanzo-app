import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();

function addDirectoryToZip(dirPath, zipFolder, rootDir) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    if (
      item === 'node_modules' ||
      item === '.git' ||
      item === 'dist' ||
      item === 'dev-dist' ||
      item === 'projeto-financas.zip' ||
      item === '.env' ||
      item.startsWith('.')
    ) {
      continue;
    }

    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const subFolder = zipFolder ? zipFolder.folder(item) : zip.folder(item);
      addDirectoryToZip(fullPath, subFolder, rootDir);
    } else {
      const content = fs.readFileSync(fullPath);
      if (zipFolder) {
        zipFolder.file(item, content);
      } else {
        zip.file(item, content);
      }
    }
  }
}

async function createProjectZip() {
  const rootDir = process.cwd();

  // Add individual files
  const rootFiles = ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'metadata.json'];
  for (const file of rootFiles) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      zip.file(file, fs.readFileSync(filePath));
    }
  }

  // Add README.md
  const readmeContent = `# Finanças Pessoais - Saldo Certo

Aplicativo completo de gestão financeira pessoal com controle de receitas, despesas, parcelamentos inteligentes, orçamentos mensais, gráficos, senha de 4 dígitos e exportação CSV.

## Como Executar
1. Instale as dependências:
   \`\`\`bash
   npm install
   \`\`\`
2. Inicie o servidor de desenvolvimento:
   \`\`\`bash
   npm run dev
   \`\`\`
3. Abra http://localhost:3000 no seu navegador.
`;
  zip.file('README.md', readmeContent);

  // Add src directory
  const srcDir = path.join(rootDir, 'src');
  if (fs.existsSync(srcDir)) {
    const srcFolder = zip.folder('src');
    addDirectoryToZip(srcDir, srcFolder, rootDir);
  }

  // Add public directory (excluding zip itself)
  const publicDir = path.join(rootDir, 'public');
  if (fs.existsSync(publicDir)) {
    const publicFolder = zip.folder('public');
    const pubItems = fs.readdirSync(publicDir);
    for (const item of pubItems) {
      if (item.endsWith('.zip')) continue;
      const pubPath = path.join(publicDir, item);
      if (fs.statSync(pubPath).isFile()) {
        publicFolder.file(item, fs.readFileSync(pubPath));
      }
    }
  }

  const outputDir = path.join(rootDir, 'public');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'projeto-financas.zip');
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, buffer);

  console.log(`ZIP gerado com sucesso em ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

createProjectZip().catch((err) => {
  console.error('Erro ao gerar ZIP:', err);
  process.exit(1);
});
