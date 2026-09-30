import {EXPECTED_INPUTS} from './expected-inputs.mjs';
export async function loadVerifiedKit({readBytes,sha256}){
 const kit={};for(const [key,expected] of Object.entries(EXPECTED_INPUTS)){const bytes=await readBytes(expected.path);if(await sha256(bytes)!==expected.sha256)throw Error('S1_NONCANONICAL_INPUT:'+key);kit[key]=JSON.parse(new TextDecoder().decode(bytes));}
 kit.vessel_board_sha256='3318fbf8a718438520b12e9d8d28d88374a46041fc94b3efac1f23b38a50d5c8';return kit;
}
