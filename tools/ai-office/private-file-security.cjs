'use strict';
// Cross-platform private-file gate. Windows is accepted only after the native
// PowerShell NTFS verifier succeeds; there is no mode-bit fallback on win32.
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'../..');
const WINDOWS_TOOL=path.join(__dirname,'windows-private-host.ps1');
const MANAGED=new Set(['state','archive','original']);
const within=(candidate,parent)=>candidate===parent||candidate.startsWith(parent+path.sep);
function windowsRootFor(candidate){
 const absolute=path.resolve(candidate),name=path.basename(absolute).toLowerCase();
 if(!MANAGED.has(name))throw Error('WINDOWS_PRIVATE_PATH_MUST_USE_MANAGED_DIRECTORY');
 return path.dirname(absolute);
}
function runWindowsAcl(action,candidate){
 const target=path.resolve(candidate),root=action==='Verify'?windowsRootFor(target):windowsRootFor(path.dirname(target));
 const args=['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',WINDOWS_TOOL,
  '-Action',action,'-Root',root];
 if(action==='VerifyFile')args.push('-FilePath',target);
 const run=spawnSync('pwsh.exe',args,{encoding:'utf8',timeout:15000,
  windowsHide:true,maxBuffer:64*1024});
 if(run.error||run.status!==0)throw Error('WINDOWS_NATIVE_ACL_VERIFICATION_FAILED');
 let result;
 try{result=JSON.parse((run.stdout||'').trim());}catch(_){throw Error('WINDOWS_ACL_RESULT_INVALID');}
 if(result.status!=='ACL_VERIFIED'||(action==='VerifyFile'&&result.fileAclVerified!==true))
  throw Error('WINDOWS_ACL_NOT_VERIFIED');
 return true;
}
function assertPrivateDirectory(value){
 if(typeof value!=='string'||!path.isAbsolute(value))throw Error('PRIVATE_ABSOLUTE_DIR_REQUIRED');
 const stat=fs.lstatSync(value),real=fs.realpathSync(value),mode=fs.statSync(real);
 if(stat.isSymbolicLink()||!mode.isDirectory()||within(real,ROOT))throw Error('UNSAFE_PRIVATE_DIRECTORY');
 if(process.platform==='win32')runWindowsAcl('Verify',real);
 else if((mode.mode&0o077)!==0)throw Error('UNSAFE_PRIVATE_DIRECTORY');
 return real;
}
function assertPrivateFile(value){
 if(typeof value!=='string'||!path.isAbsolute(value))throw Error('PRIVATE_ABSOLUTE_FILE_REQUIRED');
 const stat=fs.lstatSync(value),real=fs.realpathSync(value),mode=fs.statSync(real);
 if(stat.isSymbolicLink()||!mode.isFile()||within(real,ROOT))throw Error('UNSAFE_PRIVATE_FILE');
 if(process.platform==='win32')runWindowsAcl('VerifyFile',real);
 else if((mode.mode&0o077)!==0)throw Error('UNSAFE_PRIVATE_FILE');
 return real;
}
function verifyCreatedPrivateFile(value){
 if(process.platform==='win32')runWindowsAcl('VerifyFile',value);
 else if((fs.statSync(value).mode&0o077)!==0)throw Error('UNSAFE_CREATED_PRIVATE_FILE');
 return value;
}
module.exports={assertPrivateDirectory,assertPrivateFile,verifyCreatedPrivateFile};
