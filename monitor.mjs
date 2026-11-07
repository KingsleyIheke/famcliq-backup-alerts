import {readFile,writeFile} from 'node:fs/promises';
let state;try{state=JSON.parse(await readFile('state.json','utf8'));}catch{state={};}
let health;try{health=JSON.parse(await readFile('private-backup/health.json','utf8'));}catch{health={};}
const test=process.env.TEST_FAILURE==='true';
const healthy=!test&&health.success===true&&Date.now()-Date.parse(health.successfulAt)<27*3600000;
let sent=false;
if(healthy){state={incident:null,lastHealthyAt:new Date().toISOString()};}
else if(!state.incident){
 const incident=(test?'test-':'backup-')+(health.successfulAt||health.attemptedAt||'unavailable');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'famcliq-'+incident},body:JSON.stringify({from:'FamcliQ Backup <hello@famcliq.com>',to:[process.env.ALERT_TO],subject:test?'TEST: FamcliQ backup failure alert':'Action needed: FamcliQ daily backup has failed or stopped',text:test?'This is the authorised backup alert test. No live data was changed. The same ongoing failure will not send repeated emails.':'The daily encrypted FamcliQ backup failed or has not completed within 27 hours. Live data has not been changed by the backup. Please open GitHub, the private famcliq-encrypted-backups repository, then Actions. Check for a failed run or exhausted free allowance. Alerts resume after a successful backup.'})});
 if(!response.ok)throw Error('Alert sender rejected the message, status '+response.status);
 const receipt=await response.json();state={incident,alertSentAt:new Date().toISOString(),messageId:receipt.id};sent=true;
}
state.checkedAt=new Date().toISOString();await writeFile('state.json',JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({healthy,emailSent:sent,incidentOpen:!!state.incident}));
