const fs = require('fs');
const path = require('path');

const replacements = {
    'bg-zinc-900': 'bg-coral-tree-700',
    'hover:bg-zinc-800': 'hover:bg-coral-tree-800',

    'bg-indigo-600': 'bg-coral-tree-600',
    'hover:bg-indigo-700': 'hover:bg-coral-tree-700',

    'text-indigo-600': 'text-coral-tree-600',
    'text-indigo-700': 'text-coral-tree-700',
    'hover:text-indigo-800': 'hover:text-coral-tree-800',
    'hover:bg-indigo-50': 'hover:bg-coral-tree-50',

    'focus:border-indigo-500': 'focus:border-coral-tree-500',
    'focus:ring-indigo-500': 'focus:ring-coral-tree-500',
    'focus:ring-indigo-600': 'focus:ring-coral-tree-600',
};

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src', function (filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        for (const [key, value] of Object.entries(replacements)) {
            content = content.replace(new RegExp(key, 'g'), value);
        }

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    }
});
