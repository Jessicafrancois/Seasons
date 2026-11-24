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
const qrNode=document.getElementById('totp-qr');
function clearEnrollmentImage(){
 qrNode.removeAttribute('src');
 qrNode.hidden=true;
 secretNode.textContent='';
}

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
  clearEnrollmentImage();
  secretNode.textContent=result.secret;
  // Only use the server-issued local SVG image. Never load a third-party QR service.
  if(typeof result.qrCode==='string'&&/^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/i.test(result.qrCode)){
   qrNode.src=result.qrCode;
   qrNode.hidden=false;
  }
  confirmForm.elements.factorId.value=result.factorId;
  enrollmentResult.hidden=false;
  enrollStatus.textContent=qrNode.hidden?'Enter the manual setup key into your authenticator, then verify the current code.':'Scan the QR code with your authenticator app, then verify the current code.';
 }catch(error){enrollStatus.textContent=error.message;enrollmentResult.hidden=true;clearEnrollmentImage()}
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
  enrollmentResult.hidden=true;clearEnrollmentImage();
  enrollForm.reset();confirmForm.reset();
 }catch(error){enrollStatus.textContent=error.message}
 finally{submit.disabled=false}
});
