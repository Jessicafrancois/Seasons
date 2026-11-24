import {el,button,note} from '../components/ui.js';

const definitions={
 supabase:[['url','Supabase project URL','url'],['serviceRoleKey','Server-only service-role key','password']],
 email:[['apiKey','Resend API key','password']],
 'apple-music':[['developerToken','Apple Music developer token','password']],
 analytics:[['projectId','PostHog numeric project ID','text'],['region','Cloud region (us or eu)','text'],['apiKey','PostHog personal API key (query:read)','password']]
};
export function credentialSetup(instructions,actions,status,provider,session,vault,onUpdated){
 if(!definitions[provider])return;
 if(!session?.secure||session.role!=='Founder'){
  instructions.append(note('Saving API credentials requires the founder to sign in with an individual account and authenticator code. Temporary Basic authentication cannot save secrets.'));
  return;
 }
 const saved=vault?.providers?.some(x=>x.provider===provider);
 if(saved)instructions.append(note('An encrypted credential is saved. Its original value cannot be viewed. Reconnect to replace it or disconnect to delete it.'));
 if(vault&&!vault.ready)instructions.append(note('The encryption keyring is not yet configured on the server.'));
 const form=el('form','','integration-credential-form');
 const inputs={};
 for(const [name,label,type] of definitions[provider]){
  const field=el('label','','integration-credential-field');
  field.append(el('span',label));
  const input=document.createElement('input');
  input.type=type;input.name=name;input.required=true;input.maxLength=3000;
  input.autocomplete='off';input.setAttribute('spellcheck','false');
  input.placeholder=type==='password'?'Enter credential securely':name==='url'?'https://your-project.supabase.co':'Enter value';
  field.append(input);form.append(field);inputs[name]=input;
 }
 const save=button(saved?'Replace saved credentials':'Test and securely connect',()=>{},false);
 save.type='submit';form.append(save);
 form.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const credentials=Object.fromEntries(Object.entries(inputs).map(([name,input])=>[name,input.value]));
  save.disabled=true;status.textContent='Verifying permissions with the provider…';
  try{
   const response=await fetch('/studio/api/credentials',{
    method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-Studio-CSRF':session.csrf},
    body:JSON.stringify({provider,credentials})
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.message||result.error||'Connection rejected');
   form.reset();status.textContent=result.message;
   onUpdated?.();
  }catch(error){status.textContent=error.message||'Unable to save securely.'}
  finally{save.disabled=false}
 });
 instructions.append(form);
 if(saved){
  const disconnect=button('Remove stored credential',async()=>{
   if(!confirm('Remove the saved '+provider+' credential from Seasons Studio?'))return;
   disconnect.disabled=true;status.textContent='Removing encrypted credential…';
   try{
    const response=await fetch('/studio/api/credentials/'+encodeURIComponent(provider),{
     method:'DELETE',credentials:'same-origin',headers:{'X-Studio-CSRF':session.csrf}
    });
    const result=await response.json();
    if(!response.ok)throw Error(result.message||result.error||'Could not remove credential');
    status.textContent=result.message;onUpdated?.();
   }catch(error){status.textContent=error.message}
   finally{disconnect.disabled=false}
  },true);
  actions.append(disconnect);
 }
}
