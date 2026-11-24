// Shared navigation registry. Atelier libraries link to the management routes;
// there are no duplicate catalogs, documents, or plugin installations.
const route=(key,label,description,stage='planned')=>({key,label,description,stage});
export const creativeGroups=[
 {label:'Atelier',items:[
  route('atelier','Atelier home','Choose a document and enter the creative workspace.','available'),
  route('recent','Recent Documents','Recently saved private documents and motion drafts.','available'),
  route('editor','Canvas Editor','Design structured private documents with layers and a property inspector.','foundation'),
  route('compose','Compose Editor','Write and arrange blocks in the shared Atelier document.','foundation'),
  route('motion','Motion Editor','Adjust and save the opening motion preview.','foundation'),
  route('experience','Experience Studio','Plan multimedia scenes and interactive sequences.','foundation')
 ]},
 {label:'Page Management',items:[
  route('pages','Page Inventory','Search and edit configured public page routes.','available'),
  route('templates','Page Templates','Create reusable page structures and section templates.'),
  route('drafts','Drafts','View the saved private drafts.','available'),
  route('revisions','Revisions','Browse immutable Atelier document snapshots and restore into a new revision.','foundation')
 ]},
 {label:'Seasons Manager',items:[
  route('seasons','Active Chapter','Review the active chapter and edit its private content.','available'),
  route('future-chapters','Future Chapters','Prepare future seasons without activating them.','foundation'),
  route('historical-chapters','Historical Chapters','Preserve previous chapter releases and archive rules.','foundation')
 ]},
 {label:'Projects & Records',items:[
  route('projects','All Projects & Records','Browse the configured creative works.','foundation'),
  route('albums','Albums','Manage album projects and their eventual track lists.','foundation'),
  route('songs','Songs','Manage configured songs and original recordings.','foundation'),
  route('visual-collections','Visual Collections','Organize visual projects.','foundation'),
  route('editorial-works','Editorial Works','Manage written projects and editorial compositions.','foundation'),
  route('creative-concepts','Creative Concepts','Develop private concepts and speculative creative work.')
 ]},
 {label:'Media Library',items:[
  route('media','Media overview','Manage the shared asset library; ingestion is not yet connected.','planned'),
  route('media-images','Images','Photographs, artwork, covers, and responsive image crops.'),
  route('media-audio','Audio','Original masters, listening files, samples and waveforms.'),
  route('media-video','Video','DaVinci exports, web-ready playback versions, captions and posters.'),
  route('media-graphics','Graphics','SVG, icons, illustrations and transparent graphics.'),
  route('media-fonts','Fonts','Licensed font families, weights and variable fonts.'),
  route('media-collections','Collections','Curated, reusable collections of assets.')
 ]},
 {label:'Design System',items:[
  route('design','Design system overview','Inspect the existing Studio visual foundation and planned libraries.','foundation'),
  route('variables','Variables','Semantic design variables and seasonal overrides.'),
  route('typography','Typography','Type scales, families, weights and editorial styles.'),
  route('colors','Colors','Palettes, gradients, semantic color roles and contrast.'),
  route('components','Components','Reusable blocks, component variants and instance overrides.'),
  route('layouts','Layouts','Stacks, grids, responsive sizing and page sections.'),
  route('effects','Effects','Masks, grain, blur, overlays and visual treatments.'),
  route('motion-presets','Motion Presets','Reusable animation recipes and easing curves.'),
  route('seasonal-themes','Seasonal Themes','Chapter-specific styling and approved theme versions.')
 ]},
 {label:'Plugins',items:[
  route('plugins','Plugin Library','Discover the proposed first-party extensions.','foundation'),
  route('installed-plugins','Installed Plugins','Manage enabled extensions when the runtime is available.'),
  route('developer-studio','Developer Studio','Extension manifests, capabilities, sandbox and review tools.')
 ]}
];
export const atelierGroups=[
 {label:'Canvas',items:[
  route('editor','Page Design','Edit page content drafts.','foundation'),
  route('canvas-layers','Layers & Components','Select, nest, reorder and reuse document nodes.'),
  route('canvas-responsive','Responsive Layouts','Preview and configure desktop, tablet and mobile layout rules.'),
  route('canvas-interactions','Interactions','Define triggers, actions and accessible alternatives.')
 ]},
 {label:'Compose',items:[
  route('compose','Editorial Blocks','Edit the editorial fields of the same private page draft.','foundation'),
  route('compose-collections','Content Collections','Create structured content collections and dynamic lists.'),
  route('mapping','Notion Bindings','Register and map authorized Notion fields.','available')
 ]},
 {label:'Experience Studio',items:[
  route('experience','Experience overview','Explore the multimedia authoring workflow.','foundation'),
  route('storyboards','Storyboards','Plan the visitor journey in ordered scenes.'),
  route('scenes','Scenes','Combine visual, text, audio and video layers.'),
  route('video-composition','Video Composition','Assemble exported films with web-native overlays, playback and transitions.'),
  route('audio-composition','Audio Composition','Compose listening experiences and synchronize cues.'),
  route('motion','Motion Timelines','Edit the existing opening-grid motion settings.','foundation'),
  route('scroll-choreography','Scroll Choreography','Map page progress to animation and narrative changes.'),
  route('interactive-sequences','Interactive Sequences','Trigger state changes with events and media completion.')
 ]},
 {label:'Creative Libraries',items:[
  route('media','Media','Open the shared Media Library.'),
  route('design','Design System','Open the shared design-system foundation.','foundation'),
  route('components','Components','Open the shared component library.'),
  route('templates','Templates','Open the shared template library.'),
  route('effects','Effects & Presets','Open the shared effects library.')
 ]},
 {label:'Plugins',items:[
  route('plugins','Plugin Library','Explore the proposed extensions.','foundation'),
  route('installed-plugins','Installed Plugins','Open the shared plugin register.'),
  route('developer-studio','Developer Studio','Open extension development.')
 ]},
 {label:'Preview & Publishing',items:[
  route('preview','Preview','Open a private draft or its existing live page.','foundation'),
  route('publishing','Publishing','Approval and release remain intentionally disabled.','foundation')
 ]}
];
export const allCreativeRoutes=Object.fromEntries([...creativeGroups,...atelierGroups].flatMap(group=>group.items).map(item=>[item.key,item]));
// Prefer the management labels in the main page headings; the Atelier toolbar uses its own contextual labels.
for(const group of creativeGroups)for(const item of group.items)allCreativeRoutes[item.key]=item;
export const atelierRoutes=new Set(['atelier','recent','editor','compose','motion','experience','canvas-layers','canvas-responsive','canvas-interactions','compose-collections','storyboards','scenes','video-composition','audio-composition','scroll-choreography','interactive-sequences','preview']);
export const currentEditorRoutes=new Set(['pages','editor','compose','seasons','projects','motion','drafts','revisions','recent','albums','songs','visual-collections','editorial-works','preview']);
export const statusLabel={available:'Available',foundation:'Initial foundation',planned:'Planned'};
