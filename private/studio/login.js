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
   body:JSON.stringify({email:details.get('email'),password:details.get('password')})
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
