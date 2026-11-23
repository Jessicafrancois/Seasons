const form=document.getElementById('sign-in');
const status=document.getElementById('status');
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const button=form.querySelector('button');
 button.disabled=true;status.textContent='Verifying your account…';
 const details=new FormData(form);
 try{
  const response=await fetch('/studio/auth/login',{
   method:'POST',credentials:'same-origin',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({email:details.get('email'),password:details.get('password'),code:details.get('code')})
  });
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Sign-in unavailable');
  form.reset();
  location.replace('/studio/');
 }catch(error){
  status.textContent=error.message;
  form.querySelector('[name="password"]').value='';
  button.disabled=false;
 }
});


const enrollForm=document.getElementById('enroll-form');
const confirmForm=document.getElementById('confirm-form');
const enrollStatus=document.getElementById('enroll-status');
const enrollmentResult=document.getElementById('enroll-result');
const secretNode=document.getElementById('totp-secret');
async function authPost(path,body){
 const response=await fetch(path,{method:'POST',credentials:'same-origin',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||'Authentication unavailable');
 return result;
}
enrollForm.addEventListener('submit',async event=>{
 event.preventDefault();
 const submit=enrollForm.querySelector('button');submit.disabled=true;
 enrollStatus.textContent='Verifying your invitation…';
 try{
  const result=await authPost('/studio/auth/enroll',{
   email:enrollForm.elements.email.value,password:enrollForm.elements.password.value
  });
  secretNode.textContent=result.secret;
  confirmForm.elements.factorId.value=result.factorId;
  enrollmentResult.hidden=false;
  enrollStatus.textContent='Open your authenticator app and enter the secret above. Then verify the current code.';
 }catch(error){enrollStatus.textContent=error.message;enrollmentResult.hidden=true;secretNode.textContent=''}
 finally{submit.disabled=false}
});
confirmForm.addEventListener('submit',async event=>{
 event.preventDefault();
 const submit=confirmForm.querySelector('button');submit.disabled=true;
 enrollStatus.textContent='Confirming authenticator…';
 try{
  const result=await authPost('/studio/auth/confirm-enrollment',{
   email:enrollForm.elements.email.value,password:enrollForm.elements.password.value,
   factorId:confirmForm.elements.factorId.value,code:confirmForm.elements.code.value
  });
  enrollStatus.textContent=result.message;
  enrollmentResult.hidden=true;secretNode.textContent='';
  enrollForm.reset();confirmForm.reset();
 }catch(error){enrollStatus.textContent=error.message}
 finally{submit.disabled=false}
});
