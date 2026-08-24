import { cp, mkdir } from 'node:fs/promises';

await mkdir('www', { recursive: true });
await cp('pages', 'www/pages', { recursive: true });
await cp('js', 'www/js', { recursive: true });
await cp('css', 'www/css', { recursive: true });
await cp('index.html', 'www/index.html');
