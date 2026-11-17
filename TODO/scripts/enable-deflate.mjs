import { readFileSync, writeFileSync } from 'fs';

const httpdConfPath = 'E:\\database xampp\\apache\\conf\\httpd.conf';

try {
  let content = readFileSync(httpdConfPath, 'utf8');
  if (content.includes('#LoadModule deflate_module modules/mod_deflate.so')) {
    content = content.replace('#LoadModule deflate_module modules/mod_deflate.so', 'LoadModule deflate_module modules/mod_deflate.so');
    writeFileSync(httpdConfPath, content, 'utf8');
    console.log('Successfully enabled mod_deflate in httpd.conf');
  } else if (content.includes('LoadModule deflate_module modules/mod_deflate.so')) {
    console.log('mod_deflate is already enabled');
  } else {
    console.log('mod_deflate directive not found');
  }
} catch (err) {
  console.error('Error modifying httpd.conf:', err.message);
}
