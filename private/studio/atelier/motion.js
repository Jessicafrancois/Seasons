// Built-in, declarative extensions. No network access or arbitrary code execution.
export const plugins=[
 {id:'motion-effects',name:'Motion Effects',description:'Entrance, movement and looping effects.',version:'1.0.0',presets:['fade','rise','slide-left','slide-right','zoom-in','rotate-in','pulse','float']},
 {id:'cinematic-transitions',name:'Cinematic Transitions',description:'Dissolves, wipes, focus and reveal effects for individual layers.',version:'1.0.0',presets:['dissolve','blur-in','wipe-left','wipe-up','zoom-out','fade-out']},
 {id:'interactive-motion',name:'Interactive Motion',description:'Hover, click and viewport-triggered layer effects.',version:'1.0.0',presets:['lift','pop','soft-glow','rise','fade','zoom-in']}
];
export const presets={
 fade:{name:'Fade in',category:'Entrance'},rise:{name:'Rise',category:'Entrance'},'slide-left':{name:'Slide from left',category:'Entrance'},'slide-right':{name:'Slide from right',category:'Entrance'},'zoom-in':{name:'Zoom in',category:'Entrance'},'rotate-in':{name:'Rotate in',category:'Entrance'},
 pulse:{name:'Pulse',category:'Loop'},float:{name:'Float',category:'Loop'},dissolve:{name:'Dissolve',category:'Transition'},'blur-in':{name:'Focus reveal',category:'Transition'},'wipe-left':{name:'Wipe across',category:'Transition'},'wipe-up':{name:'Wipe up',category:'Transition'},'zoom-out':{name:'Zoom reveal',category:'Transition'},'fade-out':{name:'Fade away',category:'Exit'},lift:{name:'Lift',category:'Interaction'},pop:{name:'Pop',category:'Interaction'},'soft-glow':{name:'Soft glow',category:'Interaction'}
};
export const triggers=['enter','viewport','hover','click'];
export const easings={linear:'linear',ease:'ease','ease-in':'ease-in','ease-out':'ease-out','ease-in-out':'ease-in-out',cinematic:'cubic-bezier(.22,.61,.36,1)',spring:'cubic-bezier(.34,1.56,.64,1)'};
export function defaultMotion(preset='fade',trigger='enter'){return {preset,trigger,duration:800,delay:0,easing:'cinematic',intensity:40,repeat:1}}
export function validateMotion(m){
 if(m===null)return null;
 if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).some(k=>!['preset','trigger','duration','delay','easing','intensity','repeat'].includes(k)))throw Error('Invalid motion settings');
 const within=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
 if(!Object.hasOwn(presets,m.preset)||!triggers.includes(m.trigger)||!Object.hasOwn(easings,m.easing)||!within(m.duration,100,10000)||!within(m.delay,0,30000)||!within(m.intensity,0,100)||!within(m.repeat,1,10))throw Error('Invalid motion settings');
 return {preset:m.preset,trigger:m.trigger,duration:m.duration,delay:m.delay,easing:m.easing,intensity:m.intensity,repeat:m.repeat};
}
export function motionFrames(m,opacity=1){
 const a=m.intensity/100,d=Math.round(12+a*148),s=1+a*.45,small=1-a*.4;
 const normal={opacity,transform:'none',filter:'none',clipPath:'inset(0 0 0 0)'};
 const entrance=start=>[{...normal,...start},normal];
 switch(m.preset){
 case 'fade':case 'dissolve':return entrance({opacity:0});
 case 'rise':return entrance({opacity:0,transform:'translateY('+d+'px)'});
 case 'slide-left':return entrance({opacity:0,transform:'translateX(-'+d+'px)'});
 case 'slide-right':return entrance({opacity:0,transform:'translateX('+d+'px)'});
 case 'zoom-in':return entrance({opacity:0,transform:'scale('+small+')'});
 case 'rotate-in':return entrance({opacity:0,transform:'rotate(-'+Math.round(a*30)+'deg) scale('+small+')'});
 case 'blur-in':return entrance({opacity:0,filter:'blur('+Math.round(a*24)+'px)'});
 case 'wipe-left':return entrance({clipPath:'inset(0 100% 0 0)'});
 case 'wipe-up':return entrance({clipPath:'inset(100% 0 0 0)'});
 case 'zoom-out':return entrance({opacity:0,transform:'scale('+s+')'});
 case 'fade-out':return [normal,{...normal,opacity:0}];
 case 'pulse':case 'pop':return [normal,{...normal,transform:'scale('+(1+a*.16)+')'},normal];
 case 'float':case 'lift':return [normal,{...normal,transform:'translateY(-'+Math.round(4+a*30)+'px)'},normal];
 case 'soft-glow':return [normal,{...normal,filter:'brightness('+(1+a*.55)+')'},normal];
 default:return [normal,normal];
 }
}
export function motionOptions(m,override={}){return {duration:m.duration,delay:m.delay,easing:easings[m.easing],iterations:m.repeat,fill:'both',...override}}
export function animateLayer(element,m,opacity=1,override={}){
 if(typeof element.animate!=='function'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return null;
 return element.animate(motionFrames(m,opacity),motionOptions(m,override));
}
