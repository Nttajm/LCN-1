import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DOCS_DATA_PATH = path.resolve(__dirname, '../../dbnm/docs/docs-data.js');

export function loadDbnmDocs(docsDataPath = DOCS_DATA_PATH) {
    const code = fs.readFileSync(docsDataPath, 'utf8');
    const sandbox = { window: {}, globalThis: {} };
    vm.runInNewContext(code, sandbox, { filename: docsDataPath });
    const data = sandbox.window.DBNM_DOCS || sandbox.globalThis.DBNM_DOCS;
    if (!data || !Array.isArray(data.pages)) {
        throw new Error('docs-data.js did not define DBNM_DOCS.pages');
    }
    return data;
}
