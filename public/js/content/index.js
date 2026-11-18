import { fall } from './fall.js';

export const seasons = [fall];
export const currentSeason = fall;
export const seasonLabel = season => 'Season ' + Number(season.number) + ' ~ ' + season.title;
export const projects = seasons.flatMap(season => season.projects.map(project => ({ ...project, season })));
