import { readFileSync, writeFileSync } from 'fs';

const httpdConfPath = 'E:\\database xampp\\apache\\conf\\httpd.conf';

try {
  let content = readFileSync(httpdConfPath, 'utf8');

  // Uncomment mod_filter.so (MANDATORY for AddOutputFilterByType DEFLATE)
  if (content.includes('#LoadModule filter_module modules/mod_filter.so')) {
    content = content.replace('#LoadModule filter_module modules/mod_filter.so', 'LoadModule filter_module modules/mod_filter.so');
    writeFileSync(httpdConfPath, content, 'utf8');
    console.log('Successfully enabled mod_filter in httpd.conf');
  } else if (content.includes('LoadModule filter_module modules/mod_filter.so')) {
    console.log('mod_filter is already enabled');
  } else {
    console.log('mod_filter not found');
  }
} catch (err) {
  console.error('Error modifying httpd.conf:', err.message);
}
