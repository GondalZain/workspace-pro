import { readFileSync, writeFileSync } from 'fs';

const httpdConfPath = 'E:\\database xampp\\apache\\conf\\httpd.conf';

try {
  let content = readFileSync(httpdConfPath, 'utf8');

  // ServerTokens Prod (only sends 'Server: Apache' rather than Apache/2.4.58 (Win64) PHP/8.2.12 OpenSSL/3.1.3)
  if (content.includes('ServerTokens')) {
    content = content.replace(/ServerTokens\s+[A-Za-z]+/g, 'ServerTokens Prod');
  } else {
    content += '\nServerTokens Prod\n';
  }

  // ServerSignature Off (suppresses server footer on 404 and error pages)
  if (content.includes('ServerSignature')) {
    content = content.replace(/ServerSignature\s+[A-Za-z]+/g, 'ServerSignature Off');
  } else {
    content += 'ServerSignature Off\n';
  }

  writeFileSync(httpdConfPath, content, 'utf8');
  console.log('Successfully set ServerTokens Prod and ServerSignature Off in httpd.conf');
} catch (err) {
  console.error('Error modifying httpd.conf:', err.message);
}
