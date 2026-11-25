import {el,section,button,note,table,field} from '../components/ui.js';
import {atelierGroups,creativeGroups,allCreativeRoutes,statusLabel} from '../components/creative-navigation.js';

function directory(root,items,navigate){
 const grid=el('div','','atelier-directory');
 for(const item of items){
  const card=el('article','','card');
  const meta=el('div','','atelier-status-row');
  meta.append(el('span',item.section||'Workspace','atelier-card-meta'),el('span',statusLabel[item.stage],'tag'));
  card.append(meta,el('h3',item.label),el('p',item.description,'muted'),button(item.stage==='planned'?'View scope':'Open workspace',()=>navigate(item.key),true));
  grid.append(card);
 }
 root.append(grid);
}
export function renderAtelierToolbar(root,key,navigate){
 const toolbar=el('nav','','atelier-toolbar');toolbar.setAttribute('aria-label','Atelier workspaces');
 const head=el('div','','atelier-toolbar-head');
 head.append(el('strong','Seasons Atelier'),button('Atelier home',()=>navigate('atelier'),true));
 const modes=el('div','','atelier-mode-row');
 for(const group of atelierGroups){
  const menu=el('details','','atelier-mode');
  menu.append(el('summary',group.label));
  const links=el('div','','atelier-mode-links');
  for(const item of group.items){
   const link=button(item.label,()=>navigate(item.key),true);
   if(item.key===key)link.setAttribute('aria-current','page');
   links.append(link);
  }
  menu.append(links);modes.append(menu);
 }
 toolbar.append(head,modes);root.append(toolbar);
}
const plannedDetails={
 'canvas-layers':['Structured node tree with persistent IDs and parent-child ordering.','Select, duplicate, reorder and nest elements without losing content bindings.','Reusable component instances and overrides.'],
 'canvas-responsive':['Device breakpoints and per-breakpoint style overrides.','Stack, grid and container constraints.','Live resizing, responsive preview and overflow checks.'],
 'canvas-interactions':['Explicit trigger-and-action rules.','Click, hover, scroll, focus and media completion triggers.','Keyboard and reduced-motion alternatives.'],
 'compose-collections':['Structured editorial content and dynamic lists.','Typed fields and references to the shared document model.','Notion mapping and draft-only content import.'],
 'storyboards':['Ordered scenes with notes and references.','Scene duration, intent and transitions.','Link scenes to the page and experience timeline.'],
 'scenes':['Layer text, images, audio, video and interactive elements.','Shared component references and scene-level styles.','Preview scenes independently.'],
 'video-composition':['Import web-ready DaVinci exports while retaining original media.','Trim boundaries, poster frame, fit, mute and playback controls.','Web-native overlays, timed text, transitions, captions and mobile alternatives.'],
 'audio-composition':['Use the approved original audio assets.','Set clip boundaries, volume, fades and synchronization cues.','Playback accessibility, listener controls and soundtrack continuity.'],
 'scroll-choreography':['Map scroll progress to scene properties.','Define thresholds and easing.','Respect reduced-motion settings and device performance.'],
 'interactive-sequences':['Event-driven scene changes and state transitions.','Time, scroll, click and media events.','Preview and test fallback behavior.'],
 templates:['Reusable page and section documents.','Template versioning and editable instances.','No automatic changes to published pages.'],
 'creative-concepts':['Private concept documents for music, visual art and writing.','Link Notion research and inspiration through approved mappings.','Keep speculative third-party projects separate from the original catalog.'],
 'media-images':['Image ingest, metadata, alt text and responsive variants.','Crop, focal point, masks and image treatments.','Link assets by stable ID.'],
 'media-audio':['Preserve original masters separately from listening derivatives.','Audio metadata, waveform previews and approved usage.','Private by default.'],
 'media-video':['Original export storage and web playback derivatives.','Adaptive delivery, thumbnails, poster frames, captions and transcripts.','No automatic publishing of uploaded assets.'],
 'media-graphics':['SVG and raster artwork, icons and illustrations.','Sanitize SVG content before rendering.','Shared graphic collections and usage references.'],
 'media-fonts':['Font licensing, WOFF2 files and variable fonts.','Font family and weight metadata.','Approved font styles exposed to the editor.'],
 'media-collections':['Manual and filtered asset collections.','Stable references without duplicating original files.','Media usage and rights review.'],
 variables:['Typed color, number, spacing and typography variables.','Semantic references and seasonal overrides.','Versioned references for published chapters.'],
 typography:['Text styles, type scales and font families.','Weight, size, line height and letter spacing.','Responsive typography and font licensing.'],
 colors:['Global and seasonal palettes.','Semantic color roles and gradients.','Contrast review and token references.'],
 components:['Reusable node definitions and variants.','Editable properties and instance overrides.','Versioning and safe component migration.'],
 layouts:['Stacks, grids and responsive container constraints.','Reusable sections and spacing variables.','Desktop, tablet and mobile layout rules.'],
 effects:['Reusable blur, grain, masks, shadows and overlays.','Non-destructive appearance properties.','Performance and accessibility checks.'],
 'motion-presets':['Animation recipes, duration, delay and easing.','Apply presets to compatible document nodes.','Reduced-motion alternatives.'],
 'seasonal-themes':['Global token inheritance with chapter overrides.','Freeze approved theme versions for historical releases.','Preview themes before approval.'],
 'installed-plugins':['Installation registry and version compatibility.','Capability-based permissions and revocation.','No external plugin code execution until a sandbox exists.'],
 'developer-studio':['Manifest schema and typed extension commands.','Isolated execution with least-privilege access.','Review, testing, versioning and activity records.']
};
import {presets} from '../atelier/motion.js';
import {registry,settingsFor} from '../atelier/plugin-registry.js';
import {request as atelierRequest} from '../atelier/editor.js';
const pluginIdeas=[
 ['Motion','Motion Studio'],
 ['Theatre.js','Keyframe Studio'],
 ['Lenis','Scroll Studio'],
 ['Rive','Interactive Graphics Studio'],
 ['Konva.js','Graphics Studio'],
 ['dotLottie','Animated Asset Studio'],
 ['WaveSurfer.js','Audio Studio'],
 ['Three.js','Dimensional Studio'],
 ['Mux','Video Studio'],
 ['Remotion','Film Composition Studio'],
 ['Color Studio','Extract palettes and compose color relationships.'],
 ['Typography Lab','Typography pairing, styles and text treatment.'],
 ['Image Studio','Crop, masks, filters and image treatments.'],

 ['Audio Visualizer','Waveform and frequency-based visual effects.'],
 ['Notion Content','Insert approved mapped source content.'],
 ['Layout Library','Reusable grids, sections and compositions.'],
 ['Music Connect','Approved music links and listening components.'],
 ['Accessibility Review','Contrast, alternatives and motion review.'],
 ['Code Studio','Reviewed, isolated custom components and interactions.']
];
export async function renderCreativeDestination(root,key,snapshot,session,navigate){
 const item=allCreativeRoutes[key];
 if(!item){root.append(note('Workspace unavailable.'));return}
 if(key==='atelier'){
  const hero=el('section','','atelier-intro');
  hero.append(el('h2','A place to assemble the experience.'),el('p','Bring writing, photographs, artwork, films and music together in a private creative workspace. Work on existing page drafts now; the shared visual document engine and multimedia timeline are the next foundations.'));
  root.append(hero);
  directory(root,[
   {...allCreativeRoutes.recent,section:'Documents'},
   {...allCreativeRoutes.editor,section:'Canvas'},
   {...allCreativeRoutes.compose,section:'Compose'},
   {...allCreativeRoutes.experience,section:'Multimedia'},
   {...allCreativeRoutes.motion,section:'Motion'},
   {...allCreativeRoutes.preview,section:'Review'}
  ],navigate);return;
 }
 if(key==='experience'){
  const intro=section('Experience Studio','Initial foundation');
  intro.append(note('The opening motion editor and per-layer motion plugins are available. Open a Canvas document and select Motion to preview its entrance timeline. Scene composition, video and audio editing, and external plugin execution remain planned.'));
  root.append(intro);directory(root,atelierGroups.find(g=>g.label==='Experience Studio').items.filter(x=>x.key!==key),navigate);return;
 }
 if(key==='media'||key==='design'){
  const group=creativeGroups.find(g=>g.label===(key==='media'?'Media Library':'Design System'));
  const intro=section(item.label,statusLabel[item.stage]);
  intro.append(note(key==='media'?'The asset library will be shared across Atelier. Uploads, asset registration and media processing are not enabled yet.':'The current Studio interface uses a shared stylesheet. Editable public design tokens, component variants and seasonal theme management are not yet implemented.'));
  if(key==='design'){
   const samples=el('div','','atelier-swatches');
   for(const [label,value] of [['Studio background','#f5f5f0'],['Sidebar','#eaece6'],['Ink','#242722'],['Action','#29382d']]){
    const card=el('div','','card');card.append(el('strong',label),el('p',value,'muted'));samples.append(card);
   }intro.append(el('h3','Current Studio color values · read only'),samples,el('p','Interface: Inter / Helvetica Neue / Arial. Display: Georgia. These are current Studio styles, not approved public Fall design tokens.','muted'));
  }
  root.append(intro);directory(root,group.items.filter(x=>x.key!==key),navigate);return;
 }
 if(key==='future-chapters'||key==='historical-chapters'){
  const card=section(item.label,'Chronology');
  card.append(note(key==='future-chapters'?'The existing chronology is Fall → Winter → Spring → Summer. No future chapter creation or activation is enabled.':'Only Fall is currently configured. No historical chapter releases exist in the current public registry. Historical archive access remains unavailable when revisiting an old season.'));
  card.append(button('Open active chapter',()=>navigate('seasons'),true));root.append(card);return;
 }
 if(key==='plugins'||key==='installed-plugins'){
  const card=section(key==='plugins'?'Plugin Library':'Installed Plugins','Built-in extensions');
  const search=field('Search plugins','search','',()=>{});
  search.input.addEventListener('input',renderPlugins);
  const list=el('div','','stack');
  const notice=el('p','Loading plugin settings…','muted');
  notice.setAttribute('role','status');
  card.append(search.wrap,notice,list);
  let settings=null;
  function renderPlugins(){
   list.replaceChildren();
   const query=search.input.value.trim().toLowerCase();
   const matches=(name,description)=>[name,description].some(value=>value.toLowerCase().includes(query));
   for(const plugin of registry.filter(p=>matches(p.name,p.description))){
    const detail=el('details','','card stack');
    detail.append(el('summary',plugin.name),el('p',plugin.description));
    const config=settingsFor(settings||{},plugin.id);
    const readiness=!settings?'Settings unavailable':!config.enabled?'Disabled':
      typeof Element.prototype.animate==='function'?'Enabled · browser runtime available':'Enabled · browser runtime unavailable';
    detail.append(el('p',readiness+' · v'+plugin.version+' · '+plugin.workspace,'muted'),
     el('p','Permission: apply motion to layers.'),
     el('p',plugin.presets.map(id=>presets[id].name).join(', ')));
    if(settings){
     const enabled=field('Enabled','checkbox',config.enabled,()=>{});
     const duration=field('Default duration (ms)','number',config.duration,()=>{});
     duration.input.min=100;duration.input.max=10000;duration.input.step=1;duration.input.required=true;
     const save=button('Save settings',async()=>{
      if(!duration.input.reportValidity())return;
      save.disabled=true;
      notice.textContent='Saving '+plugin.name+' settings…';
      try{
       const result=await atelierRequest(session,'plugins/'+plugin.id,'PUT',
        {enabled:enabled.input.checked,duration:Number(duration.input.value)});
       settings[plugin.id]=result.settings;
       notice.textContent=plugin.name+' settings saved.';
       renderPlugins();
       const updated=list.querySelector('[data-plugin="'+plugin.id+'"]');
       if(updated){updated.open=true;updated.querySelector('summary').focus()}
      }catch(error){notice.textContent=error.message}
      finally{save.disabled=false}
     },true);
     detail.dataset.plugin=plugin.id;
     detail.append(enabled.wrap,duration.wrap,save,button('Open Canvas documents',()=>navigate('editor'),true));
    }
    list.append(detail);
   }
   if(key==='plugins')for(const [name,description] of pluginIdeas.filter(p=>matches(...p))){
    const detail=el('details','','card');
    detail.append(el('summary',name),el('p',description),el('p','Planned','muted'));
    list.append(detail);
   }
   if(!list.childElementCount)list.append(note('No matching plugins.'));
  }
  renderPlugins();
  async function loadSettings(){
   try{
    if(!session?.secure)throw Error('Secure Studio access is required to manage plugins.');
    settings=(await atelierRequest(session,'plugins')).settings;
    notice.textContent='';
   }catch(error){notice.textContent=error.message}
   renderPlugins();
  }
  loadSettings();
  card.append(button('Installed Plugins',()=>navigate('installed-plugins'),true),button('Developer Studio',()=>navigate('developer-studio'),true));root.append(card);return;
 }
 const card=section(item.label,'Planned capability');
 card.append(note('This destination is registered in the workspace. Its authoring engine and persistence are not implemented yet.'));
 card.append(el('p',item.description,'muted'));
 const list=el('ul','','atelier-planned-list');
 for(const requirement of plannedDetails[key]||[])list.append(el('li',requirement));
 card.append(list,button('Return to Atelier',()=>navigate('atelier'),true));
 if(['video-composition','audio-composition','scenes'].includes(key))card.append(button('Shared Media Library',()=>navigate('media'),true));
 if(['motion-presets','scroll-choreography','interactive-sequences'].includes(key))card.append(button('Existing Motion Editor',()=>navigate('motion'),true));
 if(key==='compose-collections'||key==='creative-concepts')card.append(button('Notion field mapping',()=>navigate('mapping'),true));
 root.append(card);
}
