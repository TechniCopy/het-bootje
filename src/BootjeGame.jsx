import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Ship, Gauge, Bike, Fan, Snowflake, Minimize2, Check, X, ChevronRight, RotateCcw, Trophy, Zap, Info, Heart } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & DATA
// ═══════════════════════════════════════════════════════════════

const SCREENS = [
  'start',
  'm1_intro', 'm1r1', 'm1r1_check',
  'm1r2', 'm1r2_check',
  'm1r3', 'm1r3_check',
  'm2_intro', 'm2r1', 'm2r1_check',
  'm2r3', 'm2r3_check',
  'm2r4', 'm2r4_check',
  'end'
];

const BOOTJE_POINTS = [
  { id: 1, xPct: 80, yPct: 30, label: 'Aanzuig compressor', color: '#2563EB' },
  { id: 2, xPct: 92, yPct: 75, label: 'Uit compressor', color: '#DC2626' },
  { id: 3, xPct: 18, yPct: 75, label: 'Uit condensor', color: '#7C3AED' },
  { id: 4, xPct: 18, yPct: 30, label: 'Na expansie', color: '#059669' },
];

const BOOTJE_LINES = [
  { from: 1, to: 2, component: 'compressor', color: '#2563EB', label: 'Compressor' },
  { from: 2, to: 3, component: 'condensor', color: '#DC2626', label: 'Condensor' },
  { from: 3, to: 4, component: 'expansieventiel', color: '#7C3AED', label: 'Expansieventiel' },
  { from: 4, to: 1, component: 'verdamper', color: '#059669', label: 'Verdamper' },
];

const COMPONENTS_INFO = [
  { id: 'compressor', label: 'Compressor', color: '#2563EB', icon: 'Zap' },
  { id: 'condensor', label: 'Condensor', color: '#DC2626', icon: 'Fan' },
  { id: 'expansieventiel', label: 'Expansieventiel', color: '#7C3AED', icon: 'Minimize2' },
  { id: 'verdamper', label: 'Verdamper', color: '#059669', icon: 'Snowflake' },
];

const M1R2_CARDS = [
  { id: 'a', text: 'Manometer leest 5 bar', correct: 'effectief' },
  { id: 'b', text: 'Atmosferische druk op zeeniveau (1 bar)', correct: 'absoluut' },
  { id: 'c', text: 'Fietsband opgepompt tot 3 bar', correct: 'effectief' },
  { id: 'd', text: 'Druk in een compleet vacuüm (0 bar)', correct: 'absoluut' },
  { id: 'e', text: 'Hogedrukzijde koelinstallatie: 14 bar afgelezen', correct: 'effectief' },
  { id: 'f', text: 'Druk in de vrije buitenlucht', correct: 'absoluut' },
];

// Variant pools — each round we pick one random variant per category
const M1R3_VARIANTS = {
  lagedruk: [
    { effective: 1.5, absolute: 2.5 },
    { effective: 2, absolute: 3 },
    { effective: 2.5, absolute: 3.5 },
    { effective: 3, absolute: 4 },
    { effective: 3.5, absolute: 4.5 },
  ],
  hogedruk: [
    { effective: 11, absolute: 12 },
    { effective: 13, absolute: 14 },
    { effective: 14, absolute: 15 },
    { effective: 16, absolute: 17 },
    { effective: 18, absolute: 19 },
  ],
  onderdruk: [
    { effective: -0.2, absolute: 0.8 },
    { effective: -0.3, absolute: 0.7 },
    { effective: -0.4, absolute: 0.6 },
    { effective: -0.5, absolute: 0.5 },
    { effective: -0.6, absolute: 0.4 },
  ],
};

function pickM1R3Tasks() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return [
    { context: 'Lagedruk manometer koelinstallatie', ...pick(M1R3_VARIANTS.lagedruk) },
    { context: 'Hogedruk manometer koelinstallatie', ...pick(M1R3_VARIANTS.hogedruk) },
    { context: 'Lekke installatie (onderdruk)', ...pick(M1R3_VARIANTS.onderdruk) },
  ];
}

const M2R3_PHASES = [
  {
    description: 'Het koudemiddel is volledig gasvormig en wordt gecomprimeerd naar een gas van hoge druk en hoge temperatuur. Verbind de punten waar dit gebeurt.',
    correctFrom: 1, correctTo: 2,
    componentName: 'Compressor',
    tooltip: 'De compressor comprimeert het gas. Druk én temperatuur stijgen sterk.',
    color: '#2563EB',
  },
  {
    description: 'Het oververhitte gas koelt af en condenseert tot vloeistof. De druk blijft hetzelfde, maar het koudemiddel verliest veel warmte aan de omgeving. Verbind de punten waar dit gebeurt.',
    correctFrom: 2, correctTo: 3,
    componentName: 'Condensor',
    tooltip: 'Het hete gas koelt af en condenseert tot vloeistof. De druk blijft gelijk.',
    color: '#DC2626',
  },
  {
    description: 'De vloeistof stroomt door een vernauwing. De druk stort in en de vloeistof wordt deels damp. De warmte-inhoud blijft gelijk tijdens dit proces. Verbind de punten waar dit gebeurt.',
    correctFrom: 3, correctTo: 4,
    componentName: 'Expansieventiel',
    tooltip: 'Druk daalt plotseling. Het koudemiddel wordt een mix van vloeistof en damp.',
    color: '#7C3AED',
  },
  {
    description: 'De mix van vloeistof en damp verdampt volledig en neemt daarbij warmte op uit de omgeving. De druk blijft gelijk. Verbind de punten waar dit gebeurt.',
    correctFrom: 4, correctTo: 1,
    componentName: 'Verdamper',
    tooltip: 'Het koudemiddel verdampt en neemt warmte op uit de omgeving.',
    color: '#059669',
  },
];

// Points where bootje crosses saturation lines
// 1' = where evaporator line crosses vapor line (superheat starts)
// 3' = where condenser line crosses liquid line (subcooling starts)
// Positions on the saturation lines (where the bootje crosses them in the diagram)
// 1' on vapor line at yPct=30 (p≈2 bar) → h≈378 → xPct≈69.5
// 3' on liquid line at yPct=75 (p≈15.8 bar) → h≈217 → xPct≈29.5
const SUPERHEAT_POINT = { id: "1'", xPct: 69.5, yPct: 30, label: 'Oververhitting', color: '#F97316' };
const SUBCOOL_POINT = { id: "3'", xPct: 29.5, yPct: 75, label: 'Nakoeling', color: '#3B82F6' };

// Animation data for superheat/subcool round
const OVH_NAK_PHASES = [
  { // Condensation: 2→3'→3 (vapor → coexistence → liquid → subcooled)
    title: 'Condensatie & nakoeling',
    description: 'Bekijk wat er gebeurt als het koudemiddel van punt 2 naar punt 3 stroomt. Let op wat er bij de vloeistoflijn gebeurt.',
    from: BOOTJE_POINTS[1], // point 2
    to: BOOTJE_POINTS[2],   // point 3
    primePoint: SUBCOOL_POINT,
    primeFraction: 0.85, // at what progress fraction does the line cross the liquid line
    getState: (t) => {
      const p = 10;
      if (t < 0.12) return { temp: 60 - t / 0.12 * (60 - 43), pressure: p, region: 'vapor', bubbleIntensity: 0, label: 'Oververhitte damp' };
      if (t < 0.85) {
        const coexT = (t - 0.12) / 0.73;
        return { temp: 43, pressure: p, region: 'coexistence', bubbleIntensity: 1 - coexT, label: `Condensatie — ${Math.round((1 - coexT) * 100)}% damp` };
      }
      // After liquid line = subcooling (nakoeling)
      const subT = (t - 0.85) / 0.15;
      return { temp: 43 - subT * (43 - 38), pressure: p, region: 'liquid', bubbleIntensity: 0, label: 'Nakoeling (onderkoeling)' };
    },
    explanation: 'Na de vloeistoflijn is het koudemiddel 100% vloeistof. De extra afkoeling heet nakoeling. Dit voorkomt flashgas in de vloeistofleiding voor het expansieventiel.',
  },
  { // Evaporation: 4→1'→1 (coexistence → vapor → superheated)
    title: 'Verdamping & oververhitting',
    description: 'Bekijk wat er gebeurt als het koudemiddel van punt 4 naar punt 1 stroomt. Let op wat er bij de damplijn gebeurt.',
    from: BOOTJE_POINTS[3], // point 4
    to: BOOTJE_POINTS[0],   // point 1
    primePoint: SUPERHEAT_POINT,
    primeFraction: 0.89, // at what progress fraction does the line cross the vapor line
    getState: (t) => {
      const p = 3;
      if (t < 0.89) {
        const coexT = t / 0.89;
        return { temp: 8.5, pressure: p, region: 'coexistence', bubbleIntensity: 0.2 + coexT * 0.8, label: `Verdamping — ${Math.round(coexT * 100)}% damp` };
      }
      // After vapor line = superheat (oververhitting)
      const supT = (t - 0.89) / 0.11;
      return { temp: 8.5 + supT * (23.3 - 8.5), pressure: p, region: 'vapor', bubbleIntensity: 0, label: 'Oververhitting' };
    },
    explanation: 'Na de damplijn is het koudemiddel 100% gas. De extra opwarming heet oververhitting. Dit beschermt de compressor tegen vloeistofslag.',
  },
];

const ITEMBANKS = {
  m1r1_check: [
    { question: 'Wat geeft een manometer aan?',
      options: ['De absolute druk t.o.v. vacuüm', 'De effectieve druk (overdruk t.o.v. atmosferische druk)', 'Altijd 1 bar minder dan de werkelijke druk', 'Het verschil tussen twee punten in een systeem'],
      correct: 1,
      feedbackCorrect: 'Klopt! De manometer toont altijd de effectieve druk.',
      feedbackWrong: 'Een manometer toont altijd de effectieve druk, d.w.z. de druk bóvenop de atmosfeer.' },
    { question: 'Een autoband is opgepompt tot 2,2 bar volgens de manometer. Hoeveel is de absolute druk?',
      options: ['1,2 bar', '2,2 bar', '3,2 bar', '4,2 bar'],
      correct: 2,
      feedbackCorrect: 'Goed! 2,2 + 1 = 3,2 bar absoluut.',
      feedbackWrong: 'Onthoud: absolute druk = effectieve druk + 1 bar (atmosferisch). Probeer het nog eens!' },
    { question: 'Welke uitspraak over atmosferische druk klopt?',
      options: ['Atmosferische druk is altijd 2 bar', 'Atmosferische druk is de absolute druk t.o.v. vacuüm, ongeveer 1 bar op zeeniveau', 'Atmosferische druk bestaat niet', 'Atmosferische druk verandert nooit'],
      correct: 1,
      feedbackCorrect: 'Precies. Op zeeniveau is dat ongeveer 1 bar absoluut.',
      feedbackWrong: 'Atmosferische druk is de druk van de lucht om ons heen — ongeveer 1 bar op zeeniveau, gemeten vanaf vacuüm.' },
  ],
  m1r2_check: [
    { question: 'Je pompt een autoband op tot 2,5 bar volgens de manometer. Hoeveel bar wordt er extra door de lucht in de band uitgeoefend bovenop de buitenlucht?',
      options: ['1,5 bar', '2,5 bar', '3,5 bar'],
      correct: 1,
      feedbackCorrect: 'Juist! De manometer leest de effectieve druk: 2,5 bar bóvenop de atmosfeer.',
      feedbackWrong: 'De manometer leest effectieve druk: dat is de druk bóvenop de atmosferische druk.' },
    { question: 'De effectieve druk in een systeem is 0 bar. Wat is de absolute druk?',
      options: ['0 bar (compleet vacuüm)', '1 bar (normale atmosferische druk)', '2 bar'],
      correct: 1,
      feedbackCorrect: 'Klopt! Effectief 0 bar = alleen de atmosferische druk = 1 bar absoluut.',
      feedbackWrong: 'Als de effectieve druk 0 is, is er geen overdruk. Wat blijft er dan over?' },
    { question: 'Welke uitspraak is juist?',
      options: ['Absolute druk = effectieve druk + 1 bar', 'Effectieve druk = absolute druk + 1 bar', 'Absolute en effectieve druk zijn hetzelfde'],
      correct: 0,
      feedbackCorrect: 'Precies! Je telt er altijd 1 bar (atmosferisch) bij op.',
      feedbackWrong: 'De formule is: absolute druk = effectieve druk + 1 bar (atmosferische druk).' },
  ],
  m1r3_check: [
    { question: 'Bij een koelinstallatie lees je op de hogedrukmanometer 12 bar af. Wat is de absolute druk?',
      options: ['11 bar', '12 bar', '13 bar', '14 bar'],
      correct: 2,
      feedbackCorrect: 'Goed! 12 + 1 = 13 bar absoluut.',
      feedbackWrong: 'Onthoud: absolute druk = effectieve druk + 1 bar (atmosferisch).' },
    { question: 'Een installatie heeft onderdruk: de manometer toont -0,5 bar. Wat is de absolute druk?',
      options: ['-1,5 bar', '0,5 bar', '1,5 bar', '0 bar'],
      correct: 1,
      feedbackCorrect: 'Klopt! 1 + (-0,5) = 0,5 bar absoluut.',
      feedbackWrong: 'Ook bij onderdruk geldt: absoluut = effectief + 1. Denk goed na!' },
    { question: 'Je meet in een verdamper een absolute druk van 4 bar. Wat leest de manometer af?',
      options: ['3 bar', '4 bar', '5 bar', '1 bar'],
      correct: 0,
      feedbackCorrect: 'Juist! Effectief = absoluut - 1. Dus 4 - 1 = 3 bar.',
      feedbackWrong: 'Effectieve druk = absolute druk - 1 bar. Reken het nog eens na!' },
  ],
  m2r1_check: [
    { question: 'Welk component zorgt voor het drukverschil in een koelsysteem?',
      options: ['Verdamper', 'Condensor', 'Compressor', 'Expansieventiel'],
      correct: 2,
      feedbackCorrect: 'Juist! De compressor perst het koudemiddel samen en verhoogt de druk.',
      feedbackWrong: 'De compressor is het onderdeel dat de druk verhoogt door het koudemiddel samen te persen.' },
    { question: 'Op welke lijn in het bootje vindt condensatie van het koudemiddel plaats?',
      options: ['De verticale lijn omhoog (1→2)', 'De horizontale lijn bovenaan (2→3)', 'De verticale lijn omlaag (3→4)', 'De horizontale lijn onderaan (4→1)'],
      correct: 1,
      feedbackCorrect: 'Klopt! In de condensor (lijn 2→3) condenseert het gas tot vloeistof.',
      feedbackWrong: 'Condensatie gebeurt in de condensor, dat is de horizontale lijn bovenaan (2→3) waar warmte wordt afgevoerd.' },
    { question: 'Welk onderdeel zorgt voor het verdampen van het koudemiddel, waarbij warmte uit de omgeving wordt opgenomen?',
      options: ['Compressor', 'Condensor', 'Expansieventiel', 'Verdamper'],
      correct: 3,
      feedbackCorrect: 'Goed! De verdamper neemt warmte op uit de omgeving, waardoor het koudemiddel verdampt.',
      feedbackWrong: 'De verdamper zorgt voor het verdampen. Het koudemiddel neemt warmte op uit de omgeving.' },
  ],
  m2r2_check: [
    { question: 'In welk gebied van het h-log p diagram ligt punt 4 (na het expansieventiel)?',
      options: ['In het gebied met oververhit gas', 'In het coexistentiegebied (mix vloeistof/damp)', 'In het gebied met puur vloeistof', 'Boven de kritische lijn'],
      correct: 1,
      feedbackCorrect: 'Klopt! Na het expansieventiel is het koudemiddel een mix van vloeistof en damp.',
      feedbackWrong: 'Na het expansieventiel is het koudemiddel deels verdampt: een mix van vloeistof en damp, dus in het coexistentiegebied.' },
    { question: 'Punt 2 en punt 3 liggen op dezelfde hoogte in het diagram. Waarom?',
      options: ['Omdat de temperatuur gelijk blijft', 'Omdat de druk tijdens condenseren niet verandert', 'Omdat de enthalpie gelijk blijft', 'Toeval, dat hoeft niet altijd'],
      correct: 1,
      feedbackCorrect: 'Juist! Condensatie is een isobaar proces: de druk blijft gelijk.',
      feedbackWrong: 'Condensatie vindt plaats bij constante druk (isobaar). Daarom liggen punt 2 en 3 op dezelfde hoogte.' },
    { question: 'Welk punt in het bootje ligt rechts onder, in het gebied van oververhit gas?',
      options: ['Punt 1', 'Punt 2', 'Punt 3', 'Punt 4'],
      correct: 0,
      feedbackCorrect: 'Goed! Punt 1 is het oververhitte gas bij lage druk, rechts onder in het diagram.',
      feedbackWrong: 'Punt 1 ligt rechts onder, buiten het coexistentiegebied, in het gebied van oververhit gas.' },
  ],
  m2r3_check: [
    { question: 'Je leest op de hogedrukmanometer 14 bar af. Op welke hoogte teken je punt 2 (hoge druklijn) in het h-log p diagram?',
      options: ['Op 13 bar', 'Op 14 bar', 'Op 15 bar (absoluut = 14 + 1)', 'Op 1 bar'],
      correct: 2,
      feedbackCorrect: 'Precies! Het h-log p diagram werkt met absolute druk. 14 bar effectief + 1 bar atmosferisch = 15 bar absoluut.',
      feedbackWrong: 'Het h-log p diagram werkt met absolute druk! Wat je afleest op de manometer is effectief. Tel er de atmosferische druk bij op.' },
    { question: 'De lagedruk manometer leest 2 bar af. Welke absolute druk teken je in het h-log p diagram voor de lagedrukzijde?',
      options: ['1 bar', '2 bar', '3 bar', '4 bar'],
      correct: 2,
      feedbackCorrect: 'Goed! 2 bar effectief + 1 bar atmosferisch = 3 bar absoluut in het diagram.',
      feedbackWrong: 'Absoluut = effectief + atmosferisch. Reken het nog eens na!' },
    { question: 'Waar in het bootje wordt warmte afgevoerd naar de omgeving?',
      options: ['In de compressor (lijn 1→2)', 'In de condensor (lijn 2→3)', 'In het expansieventiel (lijn 3→4)', 'In de verdamper (lijn 4→1)'],
      correct: 1,
      feedbackCorrect: 'Klopt! De condensor voert warmte af. Het hete gas koelt af en condenseert.',
      feedbackWrong: 'De condensor (lijn 2→3) is waar warmte aan de omgeving wordt afgevoerd.' },
  ],
  m2r4_check: [
    { question: 'Waarom is oververhitting belangrijk?',
      options: ['Het verhoogt de druk in de compressor', 'Het beschermt de compressor tegen vloeistofslag', 'Het verlaagt de temperatuur van het koudemiddel', 'Het verhoogt het rendement van de condensor'],
      correct: 1,
      feedbackCorrect: 'Juist! Oververhitting zorgt ervoor dat er geen vloeistof meer in het koudemiddel zit als het de compressor bereikt.',
      feedbackWrong: 'Denk aan wat er gebeurt als vloeistof in de compressor terechtkomt. Dat wil je voorkomen!' },
    { question: 'Wat gebeurt er met de temperatuur van het koudemiddel bij nakoeling?',
      options: ['De temperatuur stijgt', 'De temperatuur blijft gelijk', 'De temperatuur daalt iets verder na de vloeistoflijn'],
      correct: 2,
      feedbackCorrect: 'Klopt! Na de vloeistoflijn daalt de temperatuur nog iets. Dat is nakoeling.',
      feedbackWrong: 'Na de vloeistoflijn is het koudemiddel 100% vloeistof. Wat gebeurt er dan met de temperatuur?' },
    { question: 'Wat is het risico als er te weinig nakoeling is?',
      options: ['De compressor gaat kapot', 'Er komt flashgas in de vloeistofleiding voor het expansieventiel', 'De verdamper bevriest'],
      correct: 1,
      feedbackCorrect: 'Precies! Zonder voldoende nakoeling kan er damp (flashgas) ontstaan in de vloeistofleiding voor het expansieventiel, wat de capaciteit verlaagt.',
      feedbackWrong: 'Nakoeling gaat over het stuk vloeistof vóór het expansieventiel. Wat kan er misgaan als het niet 100% vloeistof is?' },
  ],
};

const SCORING = {
  m1r1: { first: 8, second: 4 },
  m1r1_check: { first: 5, second: 2 },
  m1r2_card: 2,
  m1r2_check: { first: 5, second: 2 },
  m1r3_task: 4,
  m1r3_check: { first: 5, second: 2 },
  m2r1_component: 3,
  m2r1_check: { first: 5, second: 2 },
  m2r2_point: 3,
  m2r2_check: { first: 5, second: 2 },
  m2r3_line: 3,
  m2r3_check: { first: 7, second: 3 },
  m2r4_point: 5,
  m2r4_check: { first: 5, second: 2 },
};

// SVG diagram constants (matching hlogp-microgame)
const SVG_W = 800, SVG_H = 500;
const PLOT = { left: 80, right: 760, top: 40, bottom: 440 };
const PLOT_W = PLOT.right - PLOT.left;
const PLOT_H = PLOT.bottom - PLOT.top;
const RANGE = { pMin: 0.5, pMax: 50, hMin: 100, hMax: 500 };

const pctToX = (pct) => PLOT.left + (pct / 100) * PLOT_W;
const pctToY = (pct) => PLOT.bottom - (pct / 100) * PLOT_H;

// Coordinate converters (physical units <-> pixels)
const pressureToY = (p) => {
  const logPMin = Math.log10(RANGE.pMin), logPMax = Math.log10(RANGE.pMax);
  return PLOT.bottom - ((Math.log10(p) - logPMin) / (logPMax - logPMin)) * PLOT_H;
};
const enthalpyToX = (h) => PLOT.left + ((h - RANGE.hMin) / (RANGE.hMax - RANGE.hMin)) * PLOT_W;
const toPixel = (h, p) => [enthalpyToX(h), pressureToY(p)];
const pointsToPath = (pts) => pts.map(([h, p], i) => { const [x, y] = toPixel(h, p); return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ');
const pointsToLineTo = (pts) => pts.map(([h, p]) => { const [x, y] = toPixel(h, p); return `L ${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ');

// Saturation dome data (R134a-like, from hlogp-microgame)
// Saturation dome with 40 points each for smooth curves
// Both lines meet at the critical point (290, 45) with matching tangent direction
const LIQUID_LINE = [
  [100,0.5],[102,0.55],[104,0.6],[106,0.65],[108,0.7],[110,0.75],[112,0.8],[115,0.9],
  [118,1.0],[121,1.1],[124,1.2],[127,1.35],[130,1.5],[134,1.7],[138,2.0],[142,2.3],
  [146,2.7],[150,3.0],[155,3.5],[160,4.0],[165,4.7],[170,5.5],[176,6.5],[182,7.5],
  [188,8.5],[195,10],[202,12],[210,14],[218,16],[225,18],[232,20],[240,23],
  [248,26],[255,29],[262,32],[268,35],[274,38],[279,40],[283,42],[286,43.5],[288,44.3],[290,45]
];
const VAPOR_LINE = [
  [355,0.5],[356,0.55],[357,0.6],[358,0.65],[359,0.7],[360,0.75],[361,0.8],[362,0.9],
  [364,1.0],[366,1.1],[368,1.2],[370,1.35],[372,1.5],[375,1.7],[378,2.0],[381,2.3],
  [384,2.7],[387,3.0],[390,3.5],[393,4.0],[396,4.7],[399,5.5],[402,6.5],[405,7.5],
  [407,8.5],[409,10],[410,12],[410,14],[409,16],[407,18],[405,20],[400,23],
  [393,26],[385,29],[375,32],[363,35],[348,38],[332,40],[316,42],[302,43.5],[296,44.3],[290,45]
];
const CRITICAL_POINT = { h: 290, p: 45 };

// Build dome paths
const DOME_PATH = (() => {
  const liqPx = LIQUID_LINE.map(([h, p]) => toPixel(h, p));
  const vapPx = [...VAPOR_LINE].reverse().map(([h, p]) => toPixel(h, p));
  return [...liqPx, ...vapPx].map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z';
})();
const LIQUID_PATH = pointsToPath(LIQUID_LINE);
const VAPOR_PATH = pointsToPath(VAPOR_LINE);
const [KX, KY] = toPixel(CRITICAL_POINT.h, CRITICAL_POINT.p);

// Phase region paths
const LIQUID_REGION_PATH = (() => {
  const liqRev = [...LIQUID_LINE].reverse();
  return `M ${PLOT.left} ${PLOT.bottom} L ${PLOT.left} ${KY} L ${KX} ${KY} ${pointsToLineTo(liqRev)} Z`;
})();
const SUPERHEATED_REGION_PATH = (() => {
  const vapRev = [...VAPOR_LINE].reverse();
  return `M ${PLOT.right} ${PLOT.bottom} L ${PLOT.right} ${KY} L ${KX} ${KY} ${pointsToLineTo(vapRev)} Z`;
})();

// Grid lines
const P_GRID = [1, 2, 5, 10, 20, 50];
const H_GRID = [100, 150, 200, 250, 300, 350, 400, 450, 500];

// Point descriptions for M2R2
const POINT_DESCRIPTIONS = [
  { id: 1, title: 'Punt 1 — Aanzuig compressor', desc: 'Oververhit gas, lage druk — rechts onder, net buiten het coexistentiegebied' },
  { id: 2, title: 'Punt 2 — Uit compressor', desc: 'Oververhit gas, hoge druk — rechts boven, ver buiten het coexistentiegebied' },
  { id: 3, title: 'Punt 3 — Uit condensor', desc: 'Vloeistof, hoge druk — links boven, net links van het coexistentiegebied' },
  { id: 4, title: 'Punt 4 — Na expansieventiel', desc: 'Mix vloeistof/damp, lage druk — midden onder, in het coexistentiegebied' },
];

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomQuestion(itembank) {
  const q = itembank[Math.floor(Math.random() * itembank.length)];
  const items = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct }));
  const shuffled = shuffleArray(items);
  return {
    question: q.question,
    options: shuffled.map(x => x.text),
    correct: shuffled.findIndex(x => x.isCorrect),
    feedbackCorrect: q.feedbackCorrect,
    feedbackWrong: q.feedbackWrong,
  };
}

// Prepare all questions from an itembank with shuffled options
function prepareAllQuestions(itembank) {
  return itembank.map(q => {
    const items = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct }));
    const shuffled = shuffleArray(items);
    return {
      question: q.question,
      options: shuffled.map(x => x.text),
      correct: shuffled.findIndex(x => x.isCorrect),
      feedbackCorrect: q.feedbackCorrect,
      feedbackWrong: q.feedbackWrong,
    };
  });
}

function getMissionAndRound(screen) {
  const idx = SCREENS.indexOf(screen);
  if (idx <= 0) return { mission: 0, round: 0, total: SCREENS.length };
  if (idx <= 7) return { mission: 1, round: Math.ceil((idx - 1) / 2), total: 3 };
  if (idx <= 14) return { mission: 2, round: Math.ceil((idx - 8) / 2), total: 3 };
  return { mission: 2, round: 3, total: 3 };
}

const ComponentIcon = ({ type, size = 20, className = '' }) => {
  const s = size;
  const col = className.includes('text-white') ? 'white' : '#2C1810';
  switch (type) {
    case 'compressor':
      // Hermetic compressor: rounded body with pipes on top
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" className={className}>
          <ellipse cx="20" cy="24" rx="12" ry="14" fill="none" stroke={col} strokeWidth="2.5" />
          <rect x="14" y="10" width="12" height="6" rx="2" fill="none" stroke={col} strokeWidth="2" />
          <line x1="17" y1="10" x2="17" y2="5" stroke={col} strokeWidth="2" strokeLinecap="round" />
          <line x1="23" y1="10" x2="23" y2="5" stroke={col} strokeWidth="2" strokeLinecap="round" />
          <circle cx="20" cy="26" r="3" fill="none" stroke={col} strokeWidth="1.5" />
        </svg>
      );
    case 'condensor':
      // Condenser unit: box with fan blades and fins
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" className={className}>
          <rect x="4" y="6" width="32" height="28" rx="3" fill="none" stroke={col} strokeWidth="2" />
          {[12, 17, 22, 27].map(y => <line key={y} x1="8" y1={y} x2="32" y2={y} stroke={col} strokeWidth="1" opacity="0.5" />)}
          <circle cx="20" cy="22" r="8" fill="none" stroke={col} strokeWidth="2" />
          <line x1="20" y1="14" x2="20" y2="30" stroke={col} strokeWidth="1.5" />
          <line x1="12" y1="22" x2="28" y2="22" stroke={col} strokeWidth="1.5" />
          <line x1="14" y1="16" x2="26" y2="28" stroke={col} strokeWidth="1.5" />
          <line x1="26" y1="16" x2="14" y2="28" stroke={col} strokeWidth="1.5" />
        </svg>
      );
    case 'expansieventiel':
      // Expansion valve: T-shaped body with adjustment knob
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" className={className}>
          <line x1="4" y1="24" x2="16" y2="24" stroke={col} strokeWidth="3" strokeLinecap="round" />
          <line x1="24" y1="24" x2="36" y2="24" stroke={col} strokeWidth="3" strokeLinecap="round" />
          <polygon points="16,18 24,24 16,30" fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" />
          <polygon points="24,18 16,24 24,30" fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" />
          <line x1="20" y1="18" x2="20" y2="8" stroke={col} strokeWidth="2.5" />
          <circle cx="20" cy="7" r="4" fill="none" stroke={col} strokeWidth="2" />
          <line x1="18" y1="7" x2="22" y2="7" stroke={col} strokeWidth="1.5" />
        </svg>
      );
    case 'verdamper':
      // Evaporator: coiled/finned heat exchanger
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" className={className}>
          <rect x="6" y="6" width="28" height="28" rx="2" fill="none" stroke={col} strokeWidth="2" />
          <path d="M10 10 L10 30 M14 30 L14 10 M18 10 L18 30 M22 30 L22 10 M26 10 L26 30 M30 30 L30 10"
            fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 10 Q12 8 14 10 M14 30 Q16 32 18 30 M18 10 Q20 8 22 10 M22 30 Q24 32 26 30 M26 10 Q28 8 30 10"
            fill="none" stroke={col} strokeWidth="1.5" />
          <line x1="6" y1="20" x2="2" y2="20" stroke={col} strokeWidth="2" strokeLinecap="round" />
          <line x1="34" y1="20" x2="38" y2="20" stroke={col} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default: return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ProgressBar({ screen, lives, score }) {
  const { mission, round } = getMissionAndRound(screen);
  if (mission === 0) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm" style={{ background: '#2C1810' }}>
      <span className="font-bold text-white">Missie {mission}</span>
      <span className="text-white/40">|</span>
      <div className="flex gap-1">
        {Array.from({ length: getMissionAndRound(screen).total }, (_, i) => i + 1).map(r => (
          <div key={r} className={`w-3 h-3 rounded-full border-2 border-white/60 ${r <= round ? 'bg-white' : 'bg-transparent'}`} />
        ))}
      </div>
      {screen.includes('_check') && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#FBBF24', color: '#2C1810' }}>Check</span>}
      <div className="ml-auto flex items-center gap-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(h => (
            <Heart key={h} className="w-4 h-4 transition-all duration-300"
              fill={h <= lives ? '#E74C3C' : 'transparent'}
              stroke={h <= lives ? '#E74C3C' : '#8B7355'}
              style={{ opacity: h <= lives ? 1 : 0.3 }} />
          ))}
        </div>
        <span className="text-white font-bold text-sm">Score: <span style={{ color: '#FBBF24' }}>{score}</span></span>
      </div>
    </div>
  );
}

function FeedbackPopup({ feedback, onClose }) {
  if (!feedback) return null;
  const isCorrect = feedback.type === 'correct';
  const bg = isCorrect ? '#6B8E3D' : '#B84A3D';
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="mx-4 max-w-md p-6 rounded-2xl shadow-2xl text-center bg-white"
        style={{ border: '2px solid #2C1810', animation: 'fadeInUp 0.3s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: bg }}>
          {isCorrect ? <Check className="text-white" size={24} /> : <X className="text-white" size={24} />}
        </div>
        <p className="text-sm leading-relaxed italic" style={{ color: '#2C1810' }}>{feedback.text}</p>
        <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl text-white font-bold italic hover:brightness-90 active:scale-95"
          style={{ background: bg, border: '2px solid #2C1810', boxShadow: '0 3px 0 rgba(0,0,0,0.2)' }}>
          OK
        </button>
      </div>
    </div>
  );
}

function DebugNav({ visible, currentScreen, onNavigate, onClose }) {
  if (!visible) return null;

  const menuItems = [
    { section: 'Missie 1: Druk begrijpen' },
    { screen: 'm1r1', label: 'Ronde 1.1: De fietsband' },
    { screen: 'm1r1_check', label: 'Check 1.1', isCheck: true },
    { screen: 'm1r2', label: 'Ronde 1.2: Sorteerspel' },
    { screen: 'm1r2_check', label: 'Check 1.2', isCheck: true },
    { screen: 'm1r3', label: 'Ronde 1.3: De omrekenmachine' },
    { screen: 'm1r3_check', label: 'Check 1.3', isCheck: true },
    { section: 'Missie 2: Het Bootje' },
    { screen: 'm2r1', label: 'Ronde 2.1: Componenten plaatsen' },
    { screen: 'm2r1_check', label: 'Check 2.1', isCheck: true },
    { screen: 'm2r3', label: 'Ronde 2.2: Lijnen verbinden' },
    { screen: 'm2r3_check', label: 'Check 2.2', isCheck: true },
    { screen: 'm2r4', label: 'Ronde 2.3: Oververhitting & nakoeling' },
    { screen: 'm2r4_check', label: 'Check 2.3', isCheck: true },
  ];

  const navBtn = (screen, label, bg, color) => (
    <button key={screen} onClick={() => onNavigate(screen)}
      className="w-full text-left px-4 py-2.5 rounded-lg font-semibold text-sm hover:brightness-90 active:scale-[0.98] transition-all"
      style={{ background: currentScreen === screen ? '#FBBF24' : bg, color: currentScreen === screen ? '#2C1810' : color }}>
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-80 max-h-[85vh] overflow-y-auto" style={{ background: '#F5EDD6', border: '3px solid #2C1810' }}>
        <div className="flex justify-between items-center mb-5">
          <span className="text-lg font-extrabold" style={{ color: '#2C1810' }}>Snelmenu (Ctrl+D)</span>
          <button onClick={onClose} className="hover:opacity-70" style={{ color: '#2C1810' }}><X size={20} /></button>
        </div>

        <div className="space-y-1.5">
          {menuItems.map((item, i) => {
            if (item.section) {
              return <p key={i} className="text-sm font-bold pt-3 pb-1 first:pt-0" style={{ color: '#5C3A21' }}>{item.section}</p>;
            }
            if (item.isCheck) {
              return navBtn(item.screen, item.label, '#FBBF24', '#2C1810');
            }
            return navBtn(item.screen, item.label, '#5C3A21', 'white');
          })}
        </div>

        <div className="mt-4 pt-3 space-y-1.5" style={{ borderTop: '1px solid #d4c9a8' }}>
          {navBtn('start', 'Startscherm', '#B84A3D', 'white')}
          {navBtn('end', 'Eindscherm', '#B84A3D', 'white')}
        </div>
      </div>
    </div>
  );
}

function ScoreDisplay({ score }) {
  return (
    <div className="absolute top-2 right-4 px-3 py-1 rounded-lg text-sm font-extrabold" style={{ color: '#FBBF24' }}>
      {score} / 100
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRESSURE GAUGE COMPONENT
// ═══════════════════════════════════════════════════════════════

function PressureGauge({ value, max = 4, size = 140, label = 'bar' }) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.38;
  const startAngle = -225, endAngle = 45;
  const sweep = endAngle - startAngle;
  const needleAngle = startAngle + (Math.min(value, max) / max) * sweep;
  // Determine sensible tick step: aim for 4-6 ticks
  const tickStep = max <= 5 ? 1 : max <= 10 ? 2 : max <= 20 ? 5 : 10;
  const ticks = [];
  for (let i = 0; i <= max; i += tickStep) {
    const a = (startAngle + (i / max) * sweep) * Math.PI / 180;
    const x1 = cx + (r - 8) * Math.cos(a), y1 = cy + (r - 8) * Math.sin(a);
    const x2 = cx + r * Math.cos(a), y2 = cy + r * Math.sin(a);
    const lx = cx + (r - 18) * Math.cos(a), ly = cy + (r - 18) * Math.sin(a);
    ticks.push({ x1, y1, x2, y2, lx, ly, val: i });
  }
  const na = needleAngle * Math.PI / 180;
  const nx = cx + (r - 15) * Math.cos(na), ny = cy + (r - 15) * Math.sin(na);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r + 4} fill="#f3f4f6" stroke="#9ca3af" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r} fill="white" stroke="#d1d5db" strokeWidth="1" />
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#374151" strokeWidth="2" />
          <text x={t.lx} y={t.ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#374151" fontWeight="bold">{t.val}</text>
        </g>
      ))}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'all 0.3s ease' }} />
      <circle cx={cx} cy={cy} r={4} fill="#374151" />
      <text x={cx} y={cy + r * 0.55} textAnchor="middle" fontSize="11" fill="#6b7280">{label}</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUIZ CHECK COMPONENT
// ═══════════════════════════════════════════════════════════════

function QuizCheck({ quizQs, maxPoints, onComplete, onLoseLife, lives }) {
  // quizQs is an array of questions; we step through them one by one
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [attemptsThisQ, setAttemptsThisQ] = useState(0);
  const [questionDone, setQuestionDone] = useState(false); // current question answered correctly
  const [totalPoints, setTotalPoints] = useState(0);

  const quizQ = quizQs[qIdx];
  const isLast = qIdx === quizQs.length - 1;
  const perQuestionMax = { first: Math.ceil(maxPoints.first / quizQs.length), second: Math.ceil(maxPoints.second / quizQs.length) };

  const handleCheck = () => {
    if (selected === null || lives <= 0) return;
    const isCorrect = selected === quizQ.correct;
    const newAttempts = attemptsThisQ + 1;
    setAttemptsThisQ(newAttempts);
    setChecked(true);

    if (isCorrect) {
      const pts = newAttempts === 1 ? perQuestionMax.first : perQuestionMax.second;
      setTotalPoints(p => p + pts);
      setQuestionDone(true);
    } else {
      onLoseLife?.();
    }
  };

  const handleRetry = () => {
    setSelected(null);
    setChecked(false);
  };

  const handleNext = () => {
    if (isLast) {
      // Final question correct → immediately finish and pass points to parent
      onComplete(totalPoints);
    } else {
      setQIdx(i => i + 1);
      setSelected(null);
      setChecked(false);
      setAttemptsThisQ(0);
      setQuestionDone(false);
    }
  };

  const isCorrect = checked && selected === quizQ.correct;
  const isWrong = checked && !isCorrect;

  return (
    <div className="max-w-lg mx-auto" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
      <div className="bg-white rounded-2xl p-6" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        {quizQs.length > 1 && (
          <p className="text-xs font-bold mb-2" style={{ color: '#5C3A21' }}>Vraag {qIdx + 1} van {quizQs.length}</p>
        )}
        <h3 className="text-lg font-bold italic mb-4" style={{ color: '#2C1810' }}>{quizQ.question}</h3>
        <div className="space-y-2 mb-4">
          {quizQ.options.map((opt, i) => {
            let optStyle = { border: '2px solid #e8e0c8', background: '#FAFAF5' };
            let extra = 'hover:brightness-95 cursor-pointer';
            if (selected === i && !checked) { optStyle = { border: '2px solid #5C3A21', background: '#f0e8d0' }; }
            if (checked && isCorrect && i === quizQ.correct) { optStyle = { border: '2px solid #6B8E3D', background: 'rgba(107,142,61,0.1)' }; }
            if (checked && selected === i && i !== quizQ.correct) { optStyle = { border: '2px solid #B84A3D', background: 'rgba(184,74,61,0.1)' }; }
            return (
              <button key={i} disabled={questionDone || checked} onClick={() => setSelected(i)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${extra}`} style={optStyle}>
                <span style={{ color: '#2C1810' }}>{opt}</span>
                {checked && isCorrect && i === quizQ.correct && <Check className="inline ml-2" size={16} style={{ color: '#6B8E3D' }} />}
                {checked && selected === i && i !== quizQ.correct && <X className="inline ml-2" size={16} style={{ color: '#B84A3D' }} />}
              </button>
            );
          })}
        </div>

        {checked && (
          <div className="p-3 rounded-xl text-sm mb-3 text-white italic" style={{ background: isCorrect ? '#6B8E3D' : '#B84A3D' }}>
            {isCorrect ? quizQ.feedbackCorrect : quizQ.feedbackWrong}
          </div>
        )}

        {!checked && !questionDone && (
          <button onClick={handleCheck} disabled={selected === null}
            className="w-full py-3 rounded-xl font-bold italic text-white hover:brightness-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 rgba(0,0,0,0.2)' }}>
            Controleer
          </button>
        )}
        {isWrong && lives > 0 && (
          <button onClick={handleRetry}
            className="w-full py-3 rounded-xl font-bold italic text-white hover:brightness-90 active:scale-95"
            style={{ background: '#B84A3D', border: '2px solid #2C1810', boxShadow: '0 3px 0 rgba(0,0,0,0.2)' }}>
            Probeer opnieuw
          </button>
        )}
        {questionDone && (
          <button onClick={handleNext}
            className="w-full py-3 rounded-xl font-bold italic text-white hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
            style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
            {isLast ? 'Afronden' : 'Volgende vraag'} <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// H-LOG-P DIAGRAM (SVG)
// ═══════════════════════════════════════════════════════════════

function HLogPDiagram({ points = [], lines = [], componentLabels = {}, highlightLine = null, highlightPoint = null, dropZoneHighlight = null, showDropZones = false, onSvgClick, onPointClick, interactive = false, children }) {
  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full max-w-4xl mx-auto" style={{ backgroundColor: '#FAFAF5', borderRadius: 12, border: '2px solid #2C1810', maxHeight: 400 }} onClick={onSvgClick}>
      {/* Grid lines (dashed) */}
      {P_GRID.map(p => {
        const y = pressureToY(p);
        return <g key={`pg${p}`}>
          <line x1={PLOT.left} y1={y} x2={PLOT.right} y2={y} stroke="#ddd" strokeWidth="1" strokeDasharray="4 4" />
          <text x={PLOT.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#888" fontFamily="Nunito, sans-serif">{p}</text>
        </g>;
      })}
      {H_GRID.map(h => {
        const x = enthalpyToX(h);
        return <g key={`hg${h}`}>
          <line x1={x} y1={PLOT.top} x2={x} y2={PLOT.bottom} stroke="#ddd" strokeWidth="1" strokeDasharray="4 4" />
          <text x={x} y={PLOT.bottom + 18} textAnchor="middle" fontSize="11" fill="#888" fontFamily="Nunito, sans-serif">{h}</text>
        </g>;
      })}

      {/* Axes */}
      <line x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.bottom} stroke="#2C1810" strokeWidth="2" />
      <line x1={PLOT.left} y1={PLOT.bottom} x2={PLOT.right} y2={PLOT.bottom} stroke="#2C1810" strokeWidth="2" />
      <text x={20} y={SVG_H / 2} textAnchor="middle" fontSize="13" fill="#2C1810" fontWeight="700" fontFamily="Nunito, sans-serif" transform={`rotate(-90, 20, ${SVG_H / 2})`}>Druk P (bar) — log-schaal</text>
      <text x={SVG_W / 2} y={SVG_H - 8} textAnchor="middle" fontSize="13" fill="#2C1810" fontWeight="700" fontFamily="Nunito, sans-serif">Enthalpie h (kJ/kg)</text>

      {/* Phase region colors */}
      <path d={LIQUID_REGION_PATH} fill="rgba(59, 130, 246, 0.15)" />
      <path d={DOME_PATH} fill="rgba(168, 85, 247, 0.15)" />
      <path d={SUPERHEATED_REGION_PATH} fill="rgba(239, 68, 68, 0.15)" />

      {/* Saturation dome: liquid line (blue) + vapor line (red) */}
      <path d={LIQUID_PATH} fill="none" stroke="#3B82F6" strokeWidth="2.5" />
      <path d={VAPOR_PATH} fill="none" stroke="#EF4444" strokeWidth="2.5" />

      {/* Critical point */}
      <circle cx={KX} cy={KY} r={6} fill="#2C1810" stroke="#fff" strokeWidth="2" />
      <text x={KX + 12} y={KY - 8} fontSize="13" fontWeight="700" fill="#2C1810" fontFamily="Nunito, sans-serif">K</text>

      {/* Bootje lines */}
      {lines.map((line, i) => {
        const fromPt = BOOTJE_POINTS.find(p => p.id === line.from);
        const toPt = BOOTJE_POINTS.find(p => p.id === line.to);
        if (!fromPt || !toPt) return null;
        const isHighlighted = highlightLine === line.component;
        const color = componentLabels[line.component] ? (COMPONENTS_INFO.find(c => c.id === line.component)?.color || line.color) : (isHighlighted ? dropZoneHighlight || '#93c5fd' : '#1E40AF');
        return (
          <line key={i}
            x1={pctToX(fromPt.xPct)} y1={pctToY(fromPt.yPct)}
            x2={pctToX(toPt.xPct)} y2={pctToY(toPt.yPct)}
            stroke={color} strokeWidth={isHighlighted ? 5 : 3} strokeLinecap="round"
            style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
          />
        );
      })}

      {/* Component labels on lines */}
      {Object.entries(componentLabels).map(([comp, placed]) => {
        if (!placed) return null;
        const lineData = BOOTJE_LINES.find(l => l.component === comp);
        const info = COMPONENTS_INFO.find(c => c.id === comp);
        if (!lineData || !info) return null;
        const fromPt = BOOTJE_POINTS.find(p => p.id === lineData.from);
        const toPt = BOOTJE_POINTS.find(p => p.id === lineData.to);
        const mx = (pctToX(fromPt.xPct) + pctToX(toPt.xPct)) / 2;
        const my = (pctToY(fromPt.yPct) + pctToY(toPt.yPct)) / 2;
        const isVertical = Math.abs(fromPt.xPct - toPt.xPct) < 20;
        const ox = isVertical ? -60 : 0;
        const oy = isVertical ? 0 : -20;
        return (
          <g key={comp}>
            <rect x={mx + ox - 40} y={my + oy - 10} width="80" height="20" rx="4" fill="white" fillOpacity="0.9" stroke={info.color} strokeWidth="1" />
            <text x={mx + ox} y={my + oy + 4} textAnchor="middle" fontSize="10" fill={info.color} fontWeight="bold" fontFamily="Nunito, sans-serif">{info.label}</text>
          </g>
        );
      })}

      {/* Drop zones on lines (dashed rectangles) */}
      {showDropZones && lines.map((line, i) => {
        if (componentLabels[line.component]) return null; // already placed
        const fromPt = BOOTJE_POINTS.find(p => p.id === line.from);
        const toPt = BOOTJE_POINTS.find(p => p.id === line.to);
        if (!fromPt || !toPt) return null;
        const x1 = pctToX(fromPt.xPct), y1 = pctToY(fromPt.yPct);
        const x2 = pctToX(toPt.xPct), y2 = pctToY(toPt.yPct);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const isVertical = Math.abs(fromPt.xPct - toPt.xPct) < 20;
        const w = isVertical ? 50 : Math.abs(x2 - x1) * 0.5;
        const h = isVertical ? Math.abs(y2 - y1) * 0.5 : 44;
        const isHl = highlightLine === line.component;
        return (
          <rect key={`dz-${i}`} x={mx - w / 2} y={my - h / 2} width={w} height={h} rx="8"
            fill={isHl ? 'rgba(184,74,61,0.15)' : 'rgba(44,24,16,0.06)'}
            stroke={isHl ? '#B84A3D' : '#5C3A21'} strokeWidth="2" strokeDasharray="8 4"
            style={{ transition: 'fill 0.3s, stroke 0.3s' }} />
        );
      })}

      {/* Points */}
      {points.map(pt => {
        const x = pctToX(pt.xPct), y = pctToY(pt.yPct);
        const isHl = highlightPoint === pt.id;
        return (
          <g key={pt.id} onClick={e => { e.stopPropagation(); onPointClick?.(pt.id); }} style={{ cursor: interactive ? 'pointer' : 'default' }}>
            <circle cx={x} cy={y} r={isHl ? 16 : 12} fill="white" stroke={pt.color} strokeWidth={isHl ? 3 : 2}
              style={{ transition: 'r 0.2s, stroke-width 0.2s', animation: isHl ? 'pulse-glow 1s infinite' : 'none' }} />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill={pt.color} fontWeight="bold" fontFamily="Nunito, sans-serif">{pt.id}</text>
          </g>
        );
      })}

      {children}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// START SCREEN
// ═══════════════════════════════════════════════════════════════

function StartScreen({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: '#F5EDD6' }}>
      <div className="text-center max-w-md" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ background: 'rgba(251,191,36,0.2)' }}>
          <Ship size={40} style={{ color: '#5C3A21' }} />
        </div>
        <h1 className="text-4xl font-extrabold mb-1" style={{ color: '#2C1810' }}>Het Bootje</h1>
        <h2 className="text-xl font-bold italic mb-4" style={{ color: '#5C3A21' }}>Druk & het h-log p diagram</h2>
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <p className="italic leading-relaxed" style={{ color: '#5C3A21', lineHeight: 1.7 }}>
            Leer alles over druk en het h-log p diagram. Ontdek het verschil tussen absolute en effectieve druk, en bouw het beroemde bootje op in het diagram!
          </p>
        </div>
        <button onClick={onStart}
          className="px-10 py-4 text-white rounded-2xl font-extrabold italic text-xl hover:brightness-90 active:scale-95 transition-all"
          style={{ background: '#6B8E3D', border: '3px solid #2C1810', boxShadow: '0 4px 0 #4a6b2a' }}>
          Start
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MISSION 1 INTRO
// ═══════════════════════════════════════════════════════════════

function M1IntroScreen({ onBegin }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-lg bg-white rounded-2xl p-8" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', animation: 'fadeInUp 0.5s ease-out' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.2)' }}><Gauge size={22} style={{ color: '#5C3A21' }} /></div>
          <h2 className="text-xl font-extrabold" style={{ color: '#2C1810' }}>Missie 1 — Druk begrijpen</h2>
        </div>
        <div className="italic leading-relaxed mb-6" style={{ color: '#5C3A21', lineHeight: 1.7 }}>
          <p className="font-extrabold text-lg mb-2" style={{ color: '#2C1810' }}>De manometer aflezen.</p>
          <p className="mb-2">Een manometer geeft de druk aan in een systeem. Maar daarnaast heb je ook nog de atmosferische druk.</p>
          <p>In deze missie leer je het verschil tussen <span className="inline-block px-2 py-0.5 font-bold rounded" style={{ background: '#FBBF24', color: '#2C1810' }}>absolute druk</span> en <span className="inline-block px-2 py-0.5 font-bold rounded" style={{ background: '#FBBF24', color: '#2C1810' }}>effectieve druk</span>.</p>
        </div>
        <button onClick={onBegin}
          className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
          style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
          Begin <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// M1R1 — BIKE SCENE
// ═══════════════════════════════════════════════════════════════

function BikeScene({ onComplete, onLoseLife, lives }) {
  const [pressure, setPressure] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);

  const targetReached = Math.abs(pressure - 2.5) <= 0.1;
  const options = ['1,5 bar', '2,5 bar', '3,5 bar', '4,5 bar'];
  const correctIdx = 2;

  const handleMeten = () => setShowQuestion(true);

  const handleCheck = () => {
    if (selected === null || lives <= 0) return;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setChecked(true);
    if (selected === correctIdx) {
      setDone(true);
    } else {
      onLoseLife?.();
    }
  };

  const handleRetry = () => { setSelected(null); setChecked(false); };

  const isCorrect = checked && selected === correctIdx;
  const tireWidth = Math.max(3, 6 + (pressure / 4) * 8);
  const absPressure = Math.max(0, pressure + 1);

  return (
    <div className="min-h-screen p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-2xl mx-auto" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <div className="bg-white rounded-2xl p-6 mb-4" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="text-lg font-extrabold mb-1" style={{ color: '#2C1810' }}>De fietsband</h3>
          <p className="text-sm italic mb-4" style={{ color: '#5C3A21' }}>Pomp de fietsband op tot <span className="inline-block px-2 py-0.5 font-bold rounded" style={{ background: '#FBBF24', color: '#2C1810' }}>2,5 bar</span> (effectieve druk) door de slider te schuiven.</p>

          <div className="flex items-start gap-3 mb-4">
            {/* Bike + Gauge column */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              {/* Realistic bike */}
              <svg width="150" height="120" viewBox="0 0 200 140">
                {/* Rear wheel */}
                <circle cx="50" cy="95" r="28" fill="none" stroke="#374151" strokeWidth={tireWidth} style={{ transition: 'stroke-width 0.3s' }} />
                <circle cx="50" cy="95" r="2" fill="#374151" />
                {[0,60,120,180,240,300].map(a => <line key={a} x1={50} y1={95} x2={50+22*Math.cos(a*Math.PI/180)} y2={95+22*Math.sin(a*Math.PI/180)} stroke="#9ca3af" strokeWidth="0.8" />)}
                {/* Front wheel */}
                <circle cx="150" cy="95" r="28" fill="none" stroke="#374151" strokeWidth={tireWidth} style={{ transition: 'stroke-width 0.3s' }} />
                <circle cx="150" cy="95" r="2" fill="#374151" />
                {[0,60,120,180,240,300].map(a => <line key={a} x1={150} y1={95} x2={150+22*Math.cos(a*Math.PI/180)} y2={95+22*Math.sin(a*Math.PI/180)} stroke="#9ca3af" strokeWidth="0.8" />)}
                {/* Bottom bracket */}
                <circle cx="90" cy="90" r="6" fill="none" stroke="#5C3A21" strokeWidth="2" />
                {/* Chain stay (BB to rear axle) */}
                <line x1="90" y1="90" x2="50" y2="95" stroke="#5C3A21" strokeWidth="2.5" />
                {/* Seat stay (rear axle to seat tube top) */}
                <line x1="50" y1="95" x2="85" y2="50" stroke="#5C3A21" strokeWidth="2" />
                {/* Seat tube (BB to seat) */}
                <line x1="90" y1="90" x2="85" y2="50" stroke="#5C3A21" strokeWidth="2.5" />
                {/* Down tube (BB to head tube bottom) */}
                <line x1="90" y1="90" x2="140" y2="60" stroke="#5C3A21" strokeWidth="2.5" />
                {/* Top tube (seat to head tube top) */}
                <line x1="85" y1="50" x2="140" y2="50" stroke="#5C3A21" strokeWidth="2.5" />
                {/* Head tube */}
                <line x1="140" y1="50" x2="140" y2="60" stroke="#5C3A21" strokeWidth="3" />
                {/* Fork */}
                <line x1="140" y1="60" x2="150" y2="95" stroke="#5C3A21" strokeWidth="2" />
                {/* Handlebar */}
                <line x1="135" y1="45" x2="148" y2="45" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" />
                <line x1="140" y1="45" x2="140" y2="50" stroke="#5C3A21" strokeWidth="2" />
                {/* Seat */}
                <line x1="80" y1="44" x2="92" y2="44" stroke="#2C1810" strokeWidth="4" strokeLinecap="round" />
                <line x1="85" y1="44" x2="85" y2="50" stroke="#5C3A21" strokeWidth="2" />
                {/* Pedals */}
                <line x1="82" y1="88" x2="98" y2="92" stroke="#374151" strokeWidth="2" />
                <line x1="80" y1="87" x2="84" y2="89" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" />
                <line x1="96" y1="91" x2="100" y2="93" stroke="#2C1810" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {/* Gauge */}
              <PressureGauge value={pressure} max={4} size={100} />
              <p className="text-[10px]" style={{ color: '#5C3A21' }}>Manometer</p>
            </div>

            {/* Pressure bar visualization with arrows */}
            {(() => {
              const barH = 200;
              const maxBar = 5.5; // range for display: 0 to 5.5 bar absolute
              const pxPerBar = barH / maxBar;
              const atmPx = 1 * pxPerBar; // 1 bar atmospheric in pixels
              const absPx = absPressure * pxPerBar; // absolute pressure in pixels
              const effPx = Math.abs(pressure) * pxPerBar; // effective pressure magnitude
              const barW = 50;
              const leftW = 82;
              const rightW = 140;
              const svgW = leftW + barW + rightW;
              const svgH = barH + 30;
              const barX = leftW;
              const barBottom = barH + 5;

              return (
                <div className="flex-1 flex justify-center">
                  <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ maxWidth: 280 }}>
                    {/* Bar background */}
                    <rect x={barX} y={5} width={barW} height={barH} rx="4" fill="#FAFAF5" stroke="#2C1810" strokeWidth="2" />

                    {/* Atmospheric reference line (dashed, at 1 bar height) */}
                    <line x1={barX - 4} y1={barBottom - atmPx} x2={barX + barW + 4} y2={barBottom - atmPx} stroke="#B84A3D" strokeWidth="1" strokeDasharray="3 2" />

                    {pressure >= 0 ? (
                      <>
                        {/* Positive: Red atmospheric (1 bar) at bottom */}
                        <rect x={barX + 1} y={barBottom - atmPx} width={barW - 2} height={atmPx - 1} fill="#B84A3D" rx="0" />
                        <text x={barX + barW / 2} y={barBottom - atmPx / 2 + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold" fontFamily="Nunito">1 bar</text>

                        {/* Green effective on top */}
                        {pressure > 0.05 && (
                          <>
                            <rect x={barX + 1} y={barBottom - atmPx - effPx} width={barW - 2} height={effPx} fill="#6B8E3D" />
                            {effPx > 16 && <text x={barX + barW / 2} y={barBottom - atmPx - effPx / 2 + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold" fontFamily="Nunito">{pressure.toFixed(1)}</text>}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Negative: Only show absolute pressure worth of red */}
                        {absPressure > 0.01 && (
                          <rect x={barX + 1} y={barBottom - absPx} width={barW - 2} height={absPx - 1} fill="#B84A3D" rx="0" />
                        )}
                        {absPx > 16 && <text x={barX + barW / 2} y={barBottom - absPx / 2 + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold" fontFamily="Nunito">{absPressure.toFixed(1)}</text>}

                        {/* Striped "missing" atmospheric zone */}
                        <defs>
                          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="6" stroke="#B84A3D" strokeWidth="1.5" opacity="0.3" />
                          </pattern>
                        </defs>
                        <rect x={barX + 1} y={barBottom - atmPx} width={barW - 2} height={atmPx - absPx} fill="url(#hatch)" />
                      </>
                    )}

                    {/* 0 bar label */}
                    <text x={barX + barW / 2} y={barBottom + 18} textAnchor="middle" fontSize="10" fill="#2C1810" fontWeight="bold" fontFamily="Nunito">0 bar</text>

                    {/* LEFT: atmospheric reference label */}
                    <text x={barX - 6} y={barBottom - atmPx + 4} textAnchor="end" fontSize="9" fill="#B84A3D" fontWeight="bold" fontFamily="Nunito">1 bar →</text>
                    <text x={barX - 6} y={barBottom - atmPx + 15} textAnchor="end" fontSize="8" fill="#B84A3D" fontWeight="600" fontFamily="Nunito">atmosferisch</text>

                    {/* RIGHT: Effective pressure arrow */}
                    {Math.abs(pressure) > 0.2 && (() => {
                      const arrowX = barX + barW + 12;
                      if (pressure > 0) {
                        const top = barBottom - atmPx - effPx;
                        const bot = barBottom - atmPx;
                        const mid = (top + bot) / 2;
                        return (
                          <g>
                            <line x1={arrowX} y1={top + 4} x2={arrowX} y2={bot - 4} stroke="#6B8E3D" strokeWidth="2" />
                            <polygon points={`${arrowX-3},${top+8} ${arrowX+3},${top+8} ${arrowX},${top+2}`} fill="#6B8E3D" />
                            <polygon points={`${arrowX-3},${bot-8} ${arrowX+3},${bot-8} ${arrowX},${bot-2}`} fill="#6B8E3D" />
                            <text x={arrowX + 8} y={mid - 2} fontSize="9" fill="#6B8E3D" fontWeight="bold" fontFamily="Nunito">Effectief</text>
                            <text x={arrowX + 8} y={mid + 9} fontSize="9" fill="#6B8E3D" fontWeight="bold" fontFamily="Nunito">{pressure.toFixed(1)} bar</text>
                          </g>
                        );
                      } else {
                        // Negative: show arrow pointing down from 1 bar line into the bar
                        const top = barBottom - atmPx;
                        const bot = barBottom - absPx;
                        const mid = (top + bot) / 2;
                        return (
                          <g>
                            <line x1={arrowX} y1={top + 4} x2={arrowX} y2={bot - 4} stroke="#B84A3D" strokeWidth="2" strokeDasharray="4 2" />
                            <polygon points={`${arrowX-3},${top+8} ${arrowX+3},${top+8} ${arrowX},${top+2}`} fill="#B84A3D" />
                            <polygon points={`${arrowX-3},${bot-8} ${arrowX+3},${bot-8} ${arrowX},${bot-2}`} fill="#B84A3D" />
                            <text x={arrowX + 8} y={mid - 2} fontSize="9" fill="#B84A3D" fontWeight="bold" fontFamily="Nunito">Effectief</text>
                            <text x={arrowX + 8} y={mid + 9} fontSize="9" fill="#B84A3D" fontWeight="bold" fontFamily="Nunito">{pressure.toFixed(1)} bar</text>
                          </g>
                        );
                      }
                    })()}

                    {/* RIGHT: Absolute pressure arrow */}
                    {absPressure > 0.15 && (() => {
                      const arrowX = barX + barW + 75;
                      const top = barBottom - absPx;
                      const bot = barBottom;
                      const mid = (top + bot) / 2;
                      return (
                        <g>
                          <line x1={arrowX} y1={top + 4} x2={arrowX} y2={bot - 4} stroke="#2C1810" strokeWidth="2" />
                          <polygon points={`${arrowX-3},${top+8} ${arrowX+3},${top+8} ${arrowX},${top+2}`} fill="#2C1810" />
                          <polygon points={`${arrowX-3},${bot-8} ${arrowX+3},${bot-8} ${arrowX},${bot-2}`} fill="#2C1810" />
                          <text x={arrowX + 8} y={mid - 2} fontSize="9" fill="#2C1810" fontWeight="800" fontFamily="Nunito">Absoluut</text>
                          <text x={arrowX + 8} y={mid + 9} fontSize="9" fill="#2C1810" fontWeight="bold" fontFamily="Nunito">{absPressure.toFixed(1)} bar</text>
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              );
            })()}
          </div>

          {/* Slider: -1 to 4 bar */}
          <div className="mb-4">
            <label className="flex items-center justify-between text-sm mb-1" style={{ color: '#5C3A21' }}>
              <span>Manometerdruk</span>
              <span className="font-mono font-bold" style={{ color: pressure < 0 ? '#B84A3D' : '#2C1810' }}>{pressure.toFixed(1)} bar</span>
            </label>
            <input type="range" min="-1" max="4" step="0.1" value={pressure} onChange={e => setPressure(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{ background: '#e8e0c8', accentColor: '#5C3A21' }} />
            <div className="flex justify-between text-xs mt-1" style={{ color: '#5C3A21' }}><span>-1</span><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span></div>
          </div>

          {targetReached && !showQuestion && (
            <button onClick={handleMeten} className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95" style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615', animation: 'pop-in 0.3s ease-out' }}>
              Meten
            </button>
          )}
        </div>

        {/* MC Question (NOT shuffled per spec) */}
        {showQuestion && (
          <div className="bg-white rounded-2xl p-6" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', animation: 'fadeInUp 0.3s ease-out' }}>
            <h4 className="font-bold mb-1" style={{ color: '#2C1810' }}>Vraag</h4>
            <p className="text-sm mb-4 italic" style={{ color: '#5C3A21' }}>Je leest 2,5 bar af op de manometer. Wat is de <span className="font-bold">absolute druk</span> in de band?</p>
            <div className="space-y-2 mb-4">
              {options.map((opt, i) => {
                let optStyle = { border: '2px solid #e8e0c8', background: '#FAFAF5' };
                if (selected === i && !checked) { optStyle = { border: '2px solid #5C3A21', background: '#f0e8d0' }; }
                if (checked && isCorrect && i === correctIdx) { optStyle = { border: '2px solid #6B8E3D', background: 'rgba(107,142,61,0.1)' }; }
                if (checked && selected === i && i !== correctIdx) { optStyle = { border: '2px solid #B84A3D', background: 'rgba(184,74,61,0.1)' }; }
                return (
                  <button key={i} disabled={done || checked} onClick={() => setSelected(i)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all hover:brightness-95 cursor-pointer" style={optStyle}>
                    <span style={{ color: '#2C1810' }}>{opt}</span>
                    {checked && isCorrect && i === correctIdx && <Check className="inline ml-2" size={16} style={{ color: '#6B8E3D' }} />}
                    {checked && selected === i && i !== correctIdx && <X className="inline ml-2" size={16} style={{ color: '#B84A3D' }} />}
                  </button>
                );
              })}
            </div>

            {checked && (
              <div className="p-3 rounded-xl text-sm mb-3 text-white italic" style={{ background: isCorrect ? '#6B8E3D' : '#B84A3D' }}>
                {isCorrect
                  ? 'Precies! De manometer laat zien hoeveel druk er bóvenop de buitenlucht zit. Buiten is het 1 bar atmosferische druk, dus absoluut = 2,5 + 1 = 3,5 bar.'
                  : 'Denk eraan: een manometer meet de druk bóvenop de atmosferische druk. Atmosferische druk is 1 bar. Dus absolute druk = effectieve druk + 1.'}
              </div>
            )}

            {!checked && !done && (
              <button onClick={handleCheck} disabled={selected === null}
                className="w-full py-3 rounded-xl font-bold italic text-white hover:brightness-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
                Controleer
              </button>
            )}
            {checked && !isCorrect && lives > 0 && (
              <button onClick={handleRetry}
                className="w-full py-3 rounded-xl font-bold italic text-white hover:brightness-90 active:scale-95"
                style={{ background: '#B84A3D', border: '2px solid #2C1810', boxShadow: '0 3px 0 rgba(0,0,0,0.2)' }}>
                Probeer opnieuw
              </button>
            )}
            {done && (
              <button onClick={() => onComplete(isCorrect ? (attempts === 1 ? SCORING.m1r1.first : SCORING.m1r1.second) : 0)}
                className="w-full py-3 rounded-xl font-bold italic text-white hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
                Volgende <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// M1R2 — SORTING GAME
// ═══════════════════════════════════════════════════════════════

function SortingGame({ onComplete, onLoseLife, lives }) {
  const [cards] = useState(() => shuffleArray(M1R2_CARDS));
  const [placed, setPlaced] = useState({ absoluut: [], effectief: [] });
  const [flashBin, setFlashBin] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [points, setPoints] = useState(0);
  const [dragging, setDragging] = useState(null); // { id, x, y }
  const binAbsRef = useRef(null);
  const binEffRef = useRef(null);

  const unplacedCards = cards.filter(c => !placed.absoluut.includes(c.id) && !placed.effectief.includes(c.id));
  const allPlaced = unplacedCards.length === 0;

  const tryPlace = (cardId, bin) => {
    const card = M1R2_CARDS.find(c => c.id === cardId);
    if (!card) return;
    // Remove from other bin if already placed
    setPlaced(prev => ({
      absoluut: prev.absoluut.filter(id => id !== cardId),
      effectief: prev.effectief.filter(id => id !== cardId),
    }));
    if (card.correct === bin) {
      setPlaced(prev => ({ ...prev, [bin]: [...prev[bin].filter(id => id !== cardId), cardId] }));
      setPoints(p => p + SCORING.m1r2_card);
      setSelectedCard(null);
    } else {
      setFlashBin(bin);
      setFeedback({ type: 'incorrect', text: 'Denk na: is dit een afgelezen waarde of een referentie?' });
      onLoseLife?.();
      setTimeout(() => setFlashBin(null), 600);
      setTimeout(() => setFeedback(null), 2000);
      setSelectedCard(null);
    }
  };

  // Click to select, click bin to place
  const handleCardClick = (cardId) => setSelectedCard(selectedCard === cardId ? null : cardId);
  const handleBinClick = (bin) => { if (selectedCard) tryPlace(selectedCard, bin); };
  const handleBinCardClick = (cardId, fromBin) => {
    setPlaced(prev => ({ ...prev, [fromBin]: prev[fromBin].filter(id => id !== cardId) }));
    setSelectedCard(cardId);
  };

  // Drag support (pointer events)
  const handlePointerDown = (e, cardId) => {
    e.preventDefault();
    setDragging({ id: cardId, x: e.clientX, y: e.clientY });
    setSelectedCard(null);
  };
  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    setDragging(d => d ? { ...d, x: e.clientX, y: e.clientY } : null);
  }, [dragging]);
  const handlePointerUp = useCallback((e) => {
    if (!dragging) return;
    // Check which bin we're over
    const checkBin = (ref, name) => {
      if (!ref.current) return false;
      const rect = ref.current.getBoundingClientRect();
      return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom ? name : false;
    };
    const bin = checkBin(binAbsRef, 'absoluut') || checkBin(binEffRef, 'effectief');
    if (bin) {
      tryPlace(dragging.id, bin);
    }
    setDragging(null);
  }, [dragging]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  const renderBin = (type, label, icon, ref) => {
    const binCards = placed[type];
    const isFlash = flashBin === type;
    const isOver = dragging && (() => {
      if (!ref.current) return false;
      const r = ref.current.getBoundingClientRect();
      return dragging.x >= r.left && dragging.x <= r.right && dragging.y >= r.top && dragging.y <= r.bottom;
    })();
    return (
      <div ref={ref} onClick={() => handleBinClick(type)}
        className="flex-1 min-h-48 rounded-xl p-4 transition-all cursor-pointer"
        style={{
          border: isFlash ? '2px dashed #B84A3D' : isOver ? '2px dashed #6B8E3D' : selectedCard ? '2px dashed #5C3A21' : '2px dashed #2C1810',
          background: isFlash ? 'rgba(184,74,61,0.1)' : isOver ? 'rgba(107,142,61,0.1)' : selectedCard ? 'rgba(92,58,33,0.05)' : '#FAFAF5'
        }}>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <span className="font-semibold text-sm" style={{ color: '#5C3A21' }}>{label}</span>
        </div>
        <div className="space-y-2">
          {binCards.map(id => {
            const card = M1R2_CARDS.find(c => c.id === id);
            return (
              <div key={id}
                onClick={e => { e.stopPropagation(); handleBinCardClick(id, type); }}
                onPointerDown={e => { e.stopPropagation(); handleBinCardClick(id, type); handlePointerDown(e, id); }}
                className="px-3 py-2 rounded-lg text-xs cursor-grab active:cursor-grabbing flex items-center gap-1"
                style={{ background: 'rgba(107,142,61,0.1)', border: '1px solid #6B8E3D', color: '#2C1810', touchAction: 'none' }}>
                <Check size={12} style={{ color: '#6B8E3D' }} /> {card.text}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Find the dragged card text
  const dragCard = dragging ? M1R2_CARDS.find(c => c.id === dragging.id) : null;

  return (
    <div className="min-h-screen p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-2xl mx-auto" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <div className="bg-white rounded-2xl p-6" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="text-lg font-extrabold mb-1" style={{ color: '#2C1810' }}>Sorteerspel</h3>
          <p className="text-sm italic mb-4" style={{ color: '#5C3A21' }}>Sorteer de kaartjes. Gaat het over <span className="inline-block px-2 py-0.5 font-bold rounded" style={{ background: '#FBBF24', color: '#2C1810' }}>absolute druk</span> of over wat je op een <span className="inline-block px-2 py-0.5 font-bold rounded" style={{ background: '#FBBF24', color: '#2C1810' }}>manometer</span> afleest?</p>
          <p className="text-xs mb-4" style={{ color: '#5C3A21' }}>Sleep een kaartje naar de juiste bak, of klik en dan de bak.</p>

          {/* Unplaced cards */}
          <div className="flex flex-wrap gap-2 mb-4 min-h-12">
            {unplacedCards.map(card => (
              <div key={card.id}
                onClick={() => handleCardClick(card.id)}
                onPointerDown={e => handlePointerDown(e, card.id)}
                className="px-3 py-2 rounded-lg text-sm transition-all cursor-grab active:cursor-grabbing select-none"
                style={{
                  border: selectedCard === card.id ? '2px solid #5C3A21' : '2px solid #2C1810',
                  background: selectedCard === card.id ? '#f0e8d0' : 'white',
                  color: '#2C1810',
                  boxShadow: selectedCard === card.id ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
                  transform: selectedCard === card.id ? 'scale(1.05)' : 'scale(1)',
                  opacity: dragging?.id === card.id ? 0.3 : 1,
                  touchAction: 'none',
                }}>
                {card.text}
              </div>
            ))}
          </div>

          {/* Bins */}
          <div className="flex gap-4">
            {renderBin('absoluut', 'Absolute druk', <Gauge size={18} style={{ color: '#2563EB' }} />, binAbsRef)}
            {renderBin('effectief', 'Effectieve druk (manometer)', <Gauge size={18} style={{ color: '#DC2626' }} />, binEffRef)}
          </div>

          {feedback && (
            <div className="mt-3 p-2 text-white rounded-xl text-sm text-center italic" style={{ background: '#B84A3D', animation: 'fadeInUp 0.2s' }}>
              {feedback.text}
            </div>
          )}

          {allPlaced && (
            <div className="mt-4">
              <div className="p-3 text-white rounded-xl text-sm italic mb-3" style={{ background: '#6B8E3D' }}>
                Mooi! Je herkent nu het verschil. Alles wat je op een manometer afleest is effectief. Alles wat als referentie dient (atmosferisch, vacuüm) is absoluut.
              </div>
              <button onClick={() => onComplete(points)}
                className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
                Volgende <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drag ghost */}
      {dragging && dragCard && (
        <div className="fixed pointer-events-none z-50 px-3 py-2 rounded-lg text-sm font-bold"
          style={{
            left: dragging.x, top: dragging.y, transform: 'translate(-50%, -50%)',
            background: '#FBBF24', color: '#2C1810', border: '2px solid #2C1810',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)', opacity: 0.95,
          }}>
          {dragCard.text}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// M1R3 — CONVERSION PANEL
// ═══════════════════════════════════════════════════════════════

function ConversionPanel({ onComplete, onLoseLife, lives }) {
  const [tasks] = useState(() => pickM1R3Tasks());
  const [answers, setAnswers] = useState(tasks.map(() => ''));
  const [results, setResults] = useState(tasks.map(() => null)); // null | 'correct' | 'wrong'
  const [attempts, setAttempts] = useState(tasks.map(() => 0));
  const [showHint3, setShowHint3] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const allDone = results.every(r => r === 'correct' || (r === 'wrong'));

  const handleCheck = () => {
    const newResults = [...results];
    const newAttempts = [...attempts];
    let pts = 0;

    tasks.forEach((task, i) => {
      if (results[i] === 'correct') return;
      const val = parseFloat(answers[i].replace(',', '.'));
      if (isNaN(val)) {
        newResults[i] = 'wrong';
        newAttempts[i] += 1;
        return;
      }
      if (Math.abs(val - task.absolute) <= 0.1) {
        newResults[i] = 'correct';
        pts += SCORING.m1r3_task;
      } else {
        newResults[i] = 'wrong';
        newAttempts[i] += 1;
        onLoseLife?.();
        if (i === 2 && newAttempts[i] >= 1) setShowHint3(true);
      }
    });

    // Check if any tasks are on their 2nd wrong attempt — lock them
    newResults.forEach((r, i) => {
      if (r === 'wrong' && newAttempts[i] >= 2) {
        newResults[i] = 'wrong'; // stays wrong, can't retry
      }
    });

    setResults(newResults);
    setAttempts(newAttempts);
    setTotalPoints(p => p + pts);
  };

  const canRetry = results.some((r, i) => r === 'wrong' && attempts[i] < 2);
  const handleRetry = () => {
    setResults(prev => prev.map((r, i) => (r === 'wrong' && attempts[i] < 2) ? null : r));
  };

  const allChecked = results.every(r => r !== null);
  const allCorrect = results.every(r => r === 'correct');
  const maxAttemptsReached = results.every((r, i) => r === 'correct' || attempts[i] >= 2);

  return (
    <div className="min-h-screen p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-2xl mx-auto" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <div className="bg-white rounded-2xl p-6" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="text-lg font-extrabold mb-1" style={{ color: '#2C1810' }}>De omrekenmachine</h3>
          <p className="text-sm italic mb-4" style={{ color: '#5C3A21' }}>Je bent bij een koelinstallatie. Lees elke manometer af en vul de <span className="inline-block px-2 py-0.5 font-bold rounded" style={{ background: '#FBBF24', color: '#2C1810' }}>absolute druk</span> in.</p>

          <div className="space-y-4 mb-4">
            {tasks.map((task, i) => (
              <div key={i} className="p-4 rounded-lg" style={{
                border: results[i] === 'correct' ? '2px solid #6B8E3D' : results[i] === 'wrong' ? '2px solid #B84A3D' : '2px solid #e8e0c8',
                background: results[i] === 'correct' ? 'rgba(107,142,61,0.1)' : results[i] === 'wrong' ? 'rgba(184,74,61,0.1)' : '#FAFAF5'
              }}>
                <div className="flex items-center gap-3 mb-2">
                  <PressureGauge value={Math.abs(task.effective)} max={Math.max(4, Math.ceil(Math.abs(task.effective) / 5) * 5)} size={70} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: '#2C1810' }}>{task.context}</p>
                    <p className="text-xs" style={{ color: '#5C3A21' }}>Manometer leest: <span className="font-bold" style={{ color: '#2C1810' }}>{task.effective < 0 ? task.effective.toFixed(1).replace('.', ',') : task.effective} bar</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm whitespace-nowrap" style={{ color: '#5C3A21' }}>Absolute druk:</label>
                  <input type="number" step="0.1" min="-1" max="20" value={answers[i]}
                    onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }}
                    disabled={results[i] === 'correct' || attempts[i] >= 2}
                    className="w-24 px-2 py-1.5 rounded-lg text-sm focus:outline-none disabled:opacity-50"
                    style={{ border: '2px solid #2C1810', background: (results[i] === 'correct' || attempts[i] >= 2) ? '#FAFAF5' : 'white', color: '#2C1810' }} />
                  <span className="text-sm" style={{ color: '#5C3A21' }}>bar</span>
                  {results[i] === 'correct' && <Check size={18} style={{ color: '#6B8E3D' }} />}
                  {results[i] === 'wrong' && <X size={18} style={{ color: '#B84A3D' }} />}
                  {results[i] === 'wrong' && attempts[i] >= 2 && (
                    <span className="text-xs ml-1" style={{ color: '#5C3A21' }}>Antwoord: {task.absolute} bar</span>
                  )}
                </div>
                {i === 2 && showHint3 && results[i] !== 'correct' && (
                  <p className="mt-2 text-xs p-2 rounded" style={{ color: '#5C3A21', background: 'rgba(251,191,36,0.15)', border: '1px solid #FBBF24' }}>
                    Pas op: een negatieve effectieve druk betekent onderdruk — minder dan de atmosferische druk. Gebruik de formule: absoluut = effectief + 1.
                  </p>
                )}
              </div>
            ))}
          </div>

          {!allChecked && (
            <button onClick={handleCheck} className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95"
              style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
              Controleer
            </button>
          )}

          {allChecked && canRetry && !maxAttemptsReached && (
            <button onClick={handleRetry} className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95"
              style={{ background: '#B84A3D', border: '2px solid #2C1810', boxShadow: '0 3px 0 rgba(0,0,0,0.2)' }}>
              Corrigeer fouten
            </button>
          )}

          {(allCorrect || maxAttemptsReached) && (
            <div className="mt-3">
              <div className="p-3 rounded-xl text-sm mb-3 text-white italic" style={{ background: allCorrect ? '#6B8E3D' : '#B84A3D' }}>
                {allCorrect
                  ? 'Uitstekend! Je snapt het principe volledig. Onthoud dit goed, want in missie 2 ga je dit toepassen op het h-log p diagram.'
                  : 'Het principe: absoluut = effectief + 1. Ook bij onderdruk! Probeer het nog eens.'}
              </div>
              <button onClick={() => onComplete(totalPoints)}
                className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
                Volgende <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MISSION 2 INTRO
// ═══════════════════════════════════════════════════════════════

function M2IntroScreen({ onBegin }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-lg bg-white rounded-2xl p-8" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', animation: 'fadeInUp 0.5s ease-out' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.2)' }}><Ship size={22} style={{ color: '#5C3A21' }} /></div>
          <h2 className="text-xl font-extrabold" style={{ color: '#2C1810' }}>Missie 2 — Het Bootje</h2>
        </div>
        <p className="italic leading-relaxed mb-2" style={{ color: '#5C3A21', lineHeight: 1.7 }}>
          Nu gaan we het koelproces in het h-log p diagram tekenen.
        </p>
        <p className="italic leading-relaxed mb-2" style={{ color: '#5C3A21', lineHeight: 1.7 }}>
          Dit heeft de vorm van een <span className="inline-block px-2 py-0.5 font-bold rounded" style={{ background: '#FBBF24', color: '#2C1810' }}>bootje</span>.
        </p>
        <p className="italic leading-relaxed mb-6" style={{ color: '#5C3A21', lineHeight: 1.7 }}>
          Elk hoofdcomponent heeft zijn eigen plek in het h-log p diagram. Plaats deze in het diagram en ontdek hoe het koelproces loopt.
        </p>
        <div className="mb-6 opacity-30">
          <HLogPDiagram points={BOOTJE_POINTS} lines={BOOTJE_LINES} />
        </div>
        <button onClick={onBegin}
          className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
          style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
          Aan de slag <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// M2R1 — COMPONENT PLACER
// ═══════════════════════════════════════════════════════════════

function ComponentPlacer({ onComplete, onLoseLife, lives }) {
  const [placedComponents, setPlacedComponents] = useState({});
  const [selectedComp, setSelectedComp] = useState(null);
  const [flashLine, setFlashLine] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [points, setPoints] = useState(0);
  const [dragging, setDragging] = useState(null); // { id, x, y }
  const svgRef = useRef(null);

  const allPlaced = Object.keys(placedComponents).length === 4;

  const getSvgCoords = (clientX, clientY) => {
    const svg = svgRef.current?.querySelector('svg') || svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * SVG_W, y: ((clientY - rect.top) / rect.height) * SVG_H };
  };

  const getClosestLine = (svgX, svgY) => {
    let closest = null, minDist = Infinity;
    BOOTJE_LINES.forEach(line => {
      const fromPt = BOOTJE_POINTS.find(p => p.id === line.from);
      const toPt = BOOTJE_POINTS.find(p => p.id === line.to);
      const x1 = pctToX(fromPt.xPct), y1 = pctToY(fromPt.yPct);
      const x2 = pctToX(toPt.xPct), y2 = pctToY(toPt.yPct);
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      let t = Math.max(0, Math.min(1, ((svgX - x1) * dx + (svgY - y1) * dy) / len2));
      const px = x1 + t * dx, py = y1 + t * dy;
      const dist = Math.sqrt((svgX - px) ** 2 + (svgY - py) ** 2);
      if (dist < minDist) { minDist = dist; closest = line; }
    });
    return minDist < 40 ? closest : null;
  };

  const tryPlaceComponent = (compId, clientX, clientY) => {
    const coords = getSvgCoords(clientX, clientY);
    if (!coords) return;
    const line = getClosestLine(coords.x, coords.y);
    if (!line) return;

    if (line.component === compId) {
      setPlacedComponents(prev => ({ ...prev, [compId]: true }));
      setPoints(p => p + SCORING.m2r1_component);
      setSelectedComp(null);
      setFeedback(null);
    } else {
      setFlashLine(line.component);
      const hints = {
        compressor: 'De compressor werkt alleen met volledig verdampt koudemiddel.',
        condensor: 'In de condensor verandert het koudemiddel van gasvormig naar vloeibaar.',
        expansieventiel: 'In het expansieventiel zakt de druk van het koudemiddel.',
        verdamper: 'In de verdamper verandert het koudemiddel van vloeibaar naar gasvormig.',
      };
      setFeedback({ type: 'incorrect', text: hints[compId] || 'Dat is niet de juiste lijn. Probeer opnieuw!' });
      onLoseLife?.();
      setTimeout(() => { setFlashLine(null); setFeedback(null); }, 3500);
      setSelectedComp(null);
    }
  };

  // Click: select component, then click on diagram
  const handleSvgClick = (e) => {
    if (!selectedComp) return;
    tryPlaceComponent(selectedComp, e.clientX, e.clientY);
  };

  // Drag support
  const handlePointerDown = (e, compId) => {
    e.preventDefault();
    setDragging({ id: compId, x: e.clientX, y: e.clientY });
    setSelectedComp(null);
  };
  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    setDragging(d => d ? { ...d, x: e.clientX, y: e.clientY } : null);
  }, [dragging]);
  const handlePointerUp = useCallback((e) => {
    if (!dragging) return;
    tryPlaceComponent(dragging.id, e.clientX, e.clientY);
    setDragging(null);
  }, [dragging]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  const dragComp = dragging ? COMPONENTS_INFO.find(c => c.id === dragging.id) : null;

  return (
    <div className="min-h-screen p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-3xl mx-auto" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <div className="bg-white rounded-2xl p-6" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="text-lg font-extrabold mb-1" style={{ color: '#2C1810' }}>Componenten plaatsen</h3>
          <p className="text-sm italic mb-4" style={{ color: '#5C3A21' }}>Hier zie je het bootje in het h-log p diagram. Elke lijn is een onderdeel van het koelsysteem. <span className="inline-block px-2 py-0.5 font-bold rounded" style={{ background: '#FBBF24', color: '#2C1810' }}>Sleep een component naar de juiste lijn!</span></p>

          <div ref={svgRef} onClick={handleSvgClick} className="cursor-pointer mb-4">
            <HLogPDiagram
              points={BOOTJE_POINTS}
              lines={BOOTJE_LINES}
              componentLabels={placedComponents}
              showDropZones={!allPlaced}
              highlightLine={flashLine}
              dropZoneHighlight={flashLine ? '#ef4444' : undefined}
            />
          </div>

          {/* Component cards (click + drag) */}
          <div className="flex flex-wrap gap-4 justify-center mb-4">
            {COMPONENTS_INFO.map(comp => {
              const isPlaced = placedComponents[comp.id];
              const isSelected = selectedComp === comp.id;
              const isDragging = dragging?.id === comp.id;
              return (
                <div key={comp.id}
                  onClick={() => !isPlaced && setSelectedComp(isSelected ? null : comp.id)}
                  onPointerDown={e => !isPlaced && handlePointerDown(e, comp.id)}
                  className="flex flex-col items-center gap-2 transition-all select-none"
                  style={{
                    opacity: isPlaced ? 0.5 : isDragging ? 0.3 : 1,
                    cursor: isPlaced ? 'default' : 'grab',
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    touchAction: 'none',
                  }}>
                  {/* Circular icon */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: isPlaced ? '#6B8E3D' : isSelected ? comp.color : '#2C1810',
                      border: isSelected ? `3px solid ${comp.color}` : '3px solid #2C1810',
                      boxShadow: isSelected ? `0 0 0 3px ${comp.color}40, 0 4px 12px rgba(0,0,0,0.2)` : '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                    {isPlaced ? <Check size={28} color="white" /> : <ComponentIcon type={comp.id} size={28} className="text-white" />}
                  </div>
                  {/* Label */}
                  <div className="px-3 py-1 rounded-lg text-xs font-bold italic text-center min-w-[80px]"
                    style={{
                      background: isPlaced ? '#6B8E3D' : comp.color,
                      color: 'white',
                      border: '2px solid #2C1810',
                    }}>
                    {comp.label}
                  </div>
                </div>
              );
            })}
          </div>

          {feedback && (
            <div className="p-2 text-white rounded-xl text-sm text-center italic mb-3" style={{ background: '#B84A3D' }}>{feedback.text}</div>
          )}

          {allPlaced && (
            <div className="mt-2">
              <div className="p-3 text-white rounded-xl text-sm italic mb-3" style={{ background: '#6B8E3D' }}>
                Je hebt alle vier de componenten op de juiste lijn geplaatst! Je ziet nu het complete bootje met alle onderdelen.
              </div>
              <button onClick={() => onComplete(points)}
                className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
                Volgende <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drag ghost */}
      {dragging && dragComp && (
        <div className="fixed pointer-events-none z-50 flex flex-col items-center gap-1"
          style={{ left: dragging.x, top: dragging.y, transform: 'translate(-50%, -50%)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: dragComp.color, border: '3px solid #2C1810', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
            <ComponentIcon type={dragComp.id} size={28} className="text-white" />
          </div>
          <div className="px-3 py-1 rounded-lg text-xs font-bold italic"
            style={{ background: dragComp.color, color: 'white', border: '2px solid #2C1810' }}>
            {dragComp.label}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// M2R2 — POINT PLACER
// ═══════════════════════════════════════════════════════════════

function PointPlacer({ onComplete, onLoseLife, lives }) {
  const [placedPoints, setPlacedPoints] = useState({}); // { pointId: { xPct, yPct } }
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [points, setPoints] = useState(0);
  const svgRef = useRef(null);

  const unplacedPoints = BOOTJE_POINTS.filter(p => !placedPoints[p.id]);
  const allPlaced = Object.keys(placedPoints).length === 4;

  const handleSvgClick = (e) => {
    if (!selectedPoint) return;
    const svg = svgRef.current?.querySelector('svg') || svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clickXPct = ((e.clientX - rect.left) / rect.width * SVG_W - PLOT.left) / PLOT_W * 100;
    const clickYPct = (PLOT.bottom - (e.clientY - rect.top) / rect.height * SVG_H) / PLOT_H * 100;

    const target = BOOTJE_POINTS.find(p => p.id === selectedPoint);
    if (!target) return;

    const xOk = Math.abs(clickXPct - target.xPct) <= 12;
    const yOk = Math.abs(clickYPct - target.yPct) <= 12;

    if (xOk && yOk) {
      setPlacedPoints(prev => ({ ...prev, [selectedPoint]: { xPct: target.xPct, yPct: target.yPct } }));
      setPoints(p => p + SCORING.m2r2_point);
      setSelectedPoint(null);
      setFeedback(null);
    } else {
      setFeedback({ type: 'incorrect', text: 'Kijk of het oververhit gas of vloeistof is, en of de druk hoog of laag moet zijn.' });
      onLoseLife?.();
      setTimeout(() => setFeedback(null), 2500);
      setSelectedPoint(null);
    }
  };

  const visiblePoints = Object.entries(placedPoints).map(([id, pos]) => {
    const original = BOOTJE_POINTS.find(p => p.id === parseInt(id));
    return { ...original, xPct: pos.xPct, yPct: pos.yPct };
  });

  return (
    <div className="min-h-screen p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-3xl mx-auto" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <div className="bg-white rounded-2xl p-6" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="text-lg font-extrabold mb-1" style={{ color: '#2C1810' }}>Punten plaatsen</h3>
          <p className="text-sm italic mb-4" style={{ color: '#5C3A21' }}>Sleep de vier punten naar hun juiste plek in het diagram. Gebruik de beschrijvingen om te bepalen waar ze horen.</p>

          <div ref={svgRef} onClick={handleSvgClick} className={`mb-4 ${selectedPoint ? 'cursor-crosshair' : ''}`}>
            <HLogPDiagram points={visiblePoints} lines={[]} />
          </div>

          {/* Point selector */}
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            {BOOTJE_POINTS.map(pt => {
              const isPlaced = !!placedPoints[pt.id];
              const isSelected = selectedPoint === pt.id;
              return (
                <button key={pt.id} disabled={isPlaced}
                  onClick={() => setSelectedPoint(isSelected ? null : pt.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                  style={{
                    border: '2px solid #2C1810',
                    background: isPlaced ? 'rgba(107,142,61,0.1)' : isSelected ? '#f0e8d0' : 'white',
                    color: isPlaced ? '#6B8E3D' : '#2C1810',
                    opacity: isPlaced ? 0.6 : 1,
                    cursor: isPlaced ? 'default' : 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  }}>
                  <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold" style={{ borderColor: pt.color, color: pt.color }}>{pt.id}</span>
                  <span className="text-xs">{pt.label}</span>
                  {isPlaced && <Check size={12} style={{ color: '#6B8E3D' }} />}
                </button>
              );
            })}
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {POINT_DESCRIPTIONS.map(pd => (
              <div key={pd.id} className="p-2 rounded-lg text-xs" style={{
                border: placedPoints[pd.id] ? '2px solid #6B8E3D' : selectedPoint === pd.id ? '2px solid #5C3A21' : '2px solid #e8e0c8',
                background: placedPoints[pd.id] ? 'rgba(107,142,61,0.1)' : selectedPoint === pd.id ? '#f0e8d0' : '#FAFAF5',
                color: '#2C1810'
              }}>
                <span className="font-semibold">{pd.title}</span>
                <br />{pd.desc}
              </div>
            ))}
          </div>

          {feedback && (
            <div className="p-2 text-white rounded-xl text-sm text-center italic mb-3" style={{ background: '#B84A3D' }}>{feedback.text}</div>
          )}

          {allPlaced && (
            <div className="mt-2">
              <div className="p-3 text-white rounded-xl text-sm italic mb-3" style={{ background: '#6B8E3D' }}>
                Mooi! Je hebt alle vier de punten op de juiste plek in het diagram gezet. Je snapt nu waar elk punt ligt op basis van de fase van het koudemiddel.
              </div>
              <button onClick={() => onComplete(points)}
                className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
                Volgende <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// M2R3 — LINE CONNECTOR + PROCESS ANIMATOR
// ═══════════════════════════════════════════════════════════════

// Process animation data per phase: how temp, pressure, and state evolve along the line
// Realistic values: Pc=10bar, Pe=3bar, Tc=43°C, Te=8.5°C, T_zuig=23.3°C, T_pers=60°C, T_vloeistof=38°C
const PHASE_ANIM = [
  { // Compressor 1→2: superheated vapor, temp UP, pressure UP
    getState: (t) => ({
      temp: 23.3 + t * (60 - 23.3),  // 23.3°C → 60°C
      pressure: 3 + t * 7,            // 3 → 10 bar
      region: 'vapor',
      bubbleIntensity: 0,
      label: 'Oververhitte damp',
    }),
  },
  { // Condensor 2→3: vapor → coexistence → liquid → subcooled, pressure constant 10 bar
    getState: (t) => {
      const p = 10;
      if (t < 0.15) return { temp: 60 - t / 0.15 * (60 - 43), pressure: p, region: 'vapor', bubbleIntensity: 0, label: 'Oververhitte damp' };
      if (t < 0.85) {
        const coexT = (t - 0.15) / 0.7;
        return { temp: 43, pressure: p, region: 'coexistence', bubbleIntensity: 1 - coexT, label: 'Condensatie' };
      }
      return { temp: 43 - (t - 0.85) / 0.15 * (43 - 38), pressure: p, region: 'liquid', bubbleIntensity: 0, label: 'Vloeistof' };
    },
  },
  { // Expansieventiel 3→4: liquid → mix, pressure DROP, temp DROP
    getState: (t) => ({
      temp: 38 - t * (38 - 8.5),     // 38°C → 8.5°C
      pressure: 10 - t * 7,           // 10 → 3 bar
      region: t > 0.3 ? 'coexistence' : 'liquid',
      bubbleIntensity: t > 0.3 ? (t - 0.3) * 0.5 : 0,
      label: t > 0.3 ? 'Mix vloeistof/damp' : 'Vloeistof',
    }),
  },
  { // Verdamper 4→1: coexistence → vapor → superheated, pressure constant 3 bar
    getState: (t) => {
      const p = 3;
      if (t < 0.85) {
        const coexT = t / 0.85;
        return { temp: 8.5, pressure: p, region: 'coexistence', bubbleIntensity: 0.3 + coexT * 0.7, label: 'Verdamping' };
      }
      return { temp: 8.5 + (t - 0.85) / 0.15 * (23.3 - 8.5), pressure: p, region: 'vapor', bubbleIntensity: 0, label: 'Oververhitte damp' };
    },
  },
];

// Small thermometer + barometer + refrigerant state visualization
// Canvas-based refrigerant state visualization (matching hlogp-microgame)
function RefrigerantCanvas({ fraction, region }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    while (particlesRef.current.length < 40) {
      particlesRef.current.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 3 + Math.random() * 6, vy: -0.3 - Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.5, wobble: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const liquidLevel = 15 + fraction * (H - 25);

      // Liquid
      if (fraction < 0.98) {
        const grad = ctx.createLinearGradient(0, liquidLevel, 0, H);
        grad.addColorStop(0, 'rgba(59,130,246,0.55)');
        grad.addColorStop(0.5, 'rgba(37,99,235,0.7)');
        grad.addColorStop(1, 'rgba(29,78,216,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, liquidLevel, W, H - liquidLevel);
        // Wavy surface
        const amp = 2 + fraction * 5;
        ctx.beginPath();
        ctx.moveTo(0, liquidLevel);
        for (let x = 0; x <= W; x += 2) {
          ctx.lineTo(x, liquidLevel + Math.sin(x * 0.05 + Date.now() * 0.003) * amp + Math.sin(x * 0.09 + Date.now() * 0.005) * amp * 0.4);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        ctx.fillStyle = 'rgba(59,130,246,0.3)';
        ctx.fill();
      }

      // Gas background
      if (fraction > 0.05) {
        ctx.fillStyle = `rgba(200,200,200,${region === 'vapor' ? 0.12 : Math.min(fraction * 0.3, 0.2)})`;
        ctx.fillRect(0, 0, W, liquidLevel + 5);
      }

      // Bubbles (coexistence only)
      if (fraction > 0.02 && region === 'coexistence') {
        const n = Math.floor(fraction * 35);
        for (let i = 0; i < n && i < particlesRef.current.length; i++) {
          const p = particlesRef.current[i];
          p.y += p.vy * (0.5 + fraction * 1.5);
          p.x += Math.sin(p.wobble + Date.now() * 0.003) * 0.3;
          p.wobble += 0.02;
          if (p.y < -10) { p.y = H + 5; p.x = Math.random() * W; }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (0.5 + fraction * 0.8), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.3 + fraction * 0.4})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(59,130,246,${0.2 + fraction * 0.3})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Superheated vapor clouds
      if (region === 'vapor') {
        ctx.fillStyle = 'rgba(230,230,230,0.3)';
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 10; i++) {
          const cx = W / 2 + Math.sin(Date.now() * 0.0008 + i * 0.9) * (W * 0.35);
          const cy = H / 2 + Math.cos(Date.now() * 0.001 + i * 1.1) * (H * 0.3);
          const r = 15 + Math.sin(Date.now() * 0.0015 + i * 0.7) * 6;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, 'rgba(255,255,255,0.6)');
          g.addColorStop(0.5, 'rgba(220,220,220,0.3)');
          g.addColorStop(1, 'rgba(200,200,200,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Label
      ctx.fillStyle = '#2C1810';
      ctx.font = 'bold 11px Nunito, sans-serif';
      ctx.textAlign = 'center';
      if (region === 'liquid') ctx.fillText('Vloeistof', W / 2, 14);
      else if (region === 'vapor') ctx.fillText('Oververhitte damp', W / 2, 14);
      else {
        const pct = Math.round(fraction * 100);
        ctx.fillText(`${pct}% damp / ${100 - pct}% vloeistof`, W / 2, 14);
      }

      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [fraction, region]);

  return <canvas ref={canvasRef} width={140} height={90} style={{ display: 'block', borderRadius: 6, border: '2px solid #2C1810', background: '#FAFAF5' }} />;
}

function ProcessPanel({ progress, phaseIndex, customState }) {
  const state = customState || (PHASE_ANIM[phaseIndex] ? PHASE_ANIM[phaseIndex].getState(progress) : null);
  if (!state) return null;
  const pressNorm = Math.min(1, state.pressure / 20);
  const tempColor = state.temp > 30 ? '#DC2626' : state.temp > 0 ? '#F97316' : '#3B82F6';

  // Round barometer needle angle: 0 bar = -135°, 20 bar = 135°
  const needleAngle = -135 + pressNorm * 270;
  const na = needleAngle * Math.PI / 180;
  const gaugeR = 28;

  return (
    <div className="rounded-lg p-2" style={{ background: '#FAFAF5', border: '2px solid #2C1810', width: 165 }}>
      {/* Refrigerant canvas */}
      <RefrigerantCanvas fraction={state.bubbleIntensity || (state.region === 'vapor' ? 1 : 0)} region={state.region} />

      {/* Thermometer + Barometer row */}
      <div className="flex items-center justify-around mt-1">
        {/* Thermometer */}
        <div className="flex flex-col items-center">
          <svg width="28" height="52" viewBox="0 0 36 72">
            <rect x="13" y="4" width="10" height="44" rx="5" fill="#f5f5f5" stroke="#2C1810" strokeWidth="1.5" />
            <rect x="14.5" y={4 + 42 * (1 - (state.temp + 20) / 120)} width="7"
              height={42 * ((state.temp + 20) / 120) + 2} rx="3.5" fill={tempColor} style={{ transition: 'all 0.15s' }} />
            <circle cx="18" cy="58" r="10" fill={tempColor} stroke="#2C1810" strokeWidth="1.5" style={{ transition: 'fill 0.15s' }} />
            <text x="18" y="61" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="Nunito">{Math.round(state.temp)}°</text>
          </svg>
          <span className="text-[8px] font-bold" style={{ color: '#5C3A21' }}>{Math.round(state.temp)}°C</span>
        </div>

        {/* Round barometer */}
        <div className="flex flex-col items-center">
          <svg width="52" height="52" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={gaugeR + 4} fill="#f5f5f5" stroke="#2C1810" strokeWidth="2" />
            <circle cx="36" cy="36" r={gaugeR} fill="white" stroke="#d4c9a8" strokeWidth="1" />
            {[0, 5, 10, 15, 20].map(v => {
              const a = (-135 + (v / 20) * 270) * Math.PI / 180;
              return <g key={v}>
                <line x1={36 + (gaugeR - 6) * Math.cos(a)} y1={36 + (gaugeR - 6) * Math.sin(a)} x2={36 + gaugeR * Math.cos(a)} y2={36 + gaugeR * Math.sin(a)} stroke="#2C1810" strokeWidth="1.5" />
                <text x={36 + (gaugeR - 13) * Math.cos(a)} y={36 + (gaugeR - 13) * Math.sin(a) + 3} textAnchor="middle" fontSize="7" fill="#5C3A21" fontWeight="bold">{v}</text>
              </g>;
            })}
            <line x1="36" y1="36" x2={36 + (gaugeR - 10) * Math.cos(na)} y2={36 + (gaugeR - 10) * Math.sin(na)}
              stroke="#DC2626" strokeWidth="2" strokeLinecap="round" style={{ transition: 'all 0.15s' }} />
            <circle cx="36" cy="36" r="3" fill="#2C1810" />
            <text x="36" y="50" textAnchor="middle" fontSize="7" fill="#5C3A21" fontWeight="bold">bar</text>
          </svg>
          <span className="text-[8px] font-bold" style={{ color: '#5C3A21' }}>{state.pressure.toFixed(0)} bar</span>
        </div>
      </div>
    </div>
  );
}

function LineConnector({ onComplete, onLoseLife, lives }) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [selectedFrom, setSelectedFrom] = useState(null);
  const [connectedLines, setConnectedLines] = useState([]);
  const [animating, setAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [flashWrong, setFlashWrong] = useState(false);
  const [points, setPoints] = useState(0);
  const [drawing, setDrawing] = useState(null); // { fromId, mouseX, mouseY } for line dragging
  const animRef = useRef(null);
  const svgRef = useRef(null);

  const phase = M2R3_PHASES[currentPhase];
  const allDone = connectedLines.length === 4;

  // Check if a point is near a position
  const getPointNear = (clientX, clientY) => {
    const svg = svgRef.current?.querySelector('svg') || svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * SVG_W;
    const svgY = ((clientY - rect.top) / rect.height) * SVG_H;
    for (const pt of BOOTJE_POINTS) {
      const px = pctToX(pt.xPct), py = pctToY(pt.yPct);
      if (Math.sqrt((svgX - px) ** 2 + (svgY - py) ** 2) < 25) return pt.id;
    }
    return null;
  };

  const tryConnect = (fromId, toId) => {
    if (fromId === toId) return;
    const correct = (fromId === phase.correctFrom && toId === phase.correctTo) ||
                    (fromId === phase.correctTo && toId === phase.correctFrom);
    if (correct) {
      const newLine = { from: phase.correctFrom, to: phase.correctTo, component: BOOTJE_LINES[currentPhase].component, color: phase.color };
      setConnectedLines(prev => [...prev, newLine]);
      setPoints(p => p + SCORING.m2r3_line);
      setSelectedFrom(null);
      startAnimation();
    } else {
      setFlashWrong(true);
      onLoseLife?.();
      setSelectedFrom(null);
      setTimeout(() => setFlashWrong(false), 800);
    }
  };

  // Click to select points
  const handlePointClick = (pointId) => {
    if (animating || allDone) return;
    if (selectedFrom === null) {
      setSelectedFrom(pointId);
    } else {
      tryConnect(selectedFrom, pointId);
    }
  };

  // Drag to draw line
  const handlePointerDown = useCallback((e) => {
    if (animating || allDone) return;
    const ptId = getPointNear(e.clientX, e.clientY);
    if (ptId) {
      e.preventDefault();
      setDrawing({ fromId: ptId, mouseX: e.clientX, mouseY: e.clientY });
      setSelectedFrom(null);
    }
  }, [animating, allDone]);

  const handlePointerMove = useCallback((e) => {
    if (!drawing) return;
    setDrawing(d => d ? { ...d, mouseX: e.clientX, mouseY: e.clientY } : null);
  }, [drawing]);

  const handlePointerUp = useCallback((e) => {
    if (!drawing) return;
    const toId = getPointNear(e.clientX, e.clientY);
    if (toId && toId !== drawing.fromId) {
      tryConnect(drawing.fromId, toId);
    }
    setDrawing(null);
  }, [drawing, phase]);

  useEffect(() => {
    if (!drawing) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [drawing, handlePointerMove, handlePointerUp]);

  const startAnimation = () => {
    setAnimating(true);
    setAnimProgress(0);
    const startTime = Date.now();
    const duration = 4000; // longer for richer animation

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setAnimProgress(progress);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setAnimating(false);
          if (currentPhase < 3) setCurrentPhase(p => p + 1);
        }, 1500);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const visibleLines = connectedLines.map(cl => BOOTJE_LINES.find(l => l.component === cl.component)).filter(Boolean);

  // Animation dot
  let dotX = 0, dotY = 0;
  if (animating && connectedLines.length > 0) {
    const lastLine = connectedLines[connectedLines.length - 1];
    const fromPt = BOOTJE_POINTS.find(p => p.id === lastLine.from);
    const toPt = BOOTJE_POINTS.find(p => p.id === lastLine.to);
    dotX = pctToX(fromPt.xPct) + (pctToX(toPt.xPct) - pctToX(fromPt.xPct)) * animProgress;
    dotY = pctToY(fromPt.yPct) + (pctToY(toPt.yPct) - pctToY(fromPt.yPct)) * animProgress;
  }

  // Drawing preview line coords
  let drawLineCoords = null;
  if (drawing) {
    const fromPt = BOOTJE_POINTS.find(p => p.id === drawing.fromId);
    const svg = svgRef.current?.querySelector('svg') || svgRef.current;
    if (fromPt && svg) {
      const rect = svg.getBoundingClientRect();
      drawLineCoords = {
        x1: pctToX(fromPt.xPct), y1: pctToY(fromPt.yPct),
        x2: ((drawing.mouseX - rect.left) / rect.width) * SVG_W,
        y2: ((drawing.mouseY - rect.top) / rect.height) * SVG_H,
      };
    }
  }

  const animPhaseIdx = connectedLines.length - 1;

  return (
    <div className="min-h-screen p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-3xl mx-auto" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <div className="bg-white rounded-2xl p-6" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="text-lg font-extrabold mb-1" style={{ color: '#2C1810' }}>Lijnen verbinden</h3>
          {!allDone && <p className="text-xs mb-2" style={{ color: '#5C3A21' }}>Stap {currentPhase + 1} van 4</p>}

          {!allDone && (
            <div className="p-3 rounded-lg text-sm mb-4" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid #FBBF24', color: '#2C1810', animation: 'fadeInUp 0.3s' }}>
              <p>{phase?.description}</p>
              {!animating && <p className="mt-2 text-xs" style={{ color: '#5C3A21' }}>Trek een lijn tussen de twee punten, of klik ze aan.</p>}
            </div>
          )}

          <div className="relative" ref={svgRef} onPointerDown={handlePointerDown} style={{ touchAction: 'none' }}>
            <HLogPDiagram
              points={BOOTJE_POINTS}
              lines={visibleLines}
              componentLabels={connectedLines.reduce((acc, cl) => { acc[cl.component] = true; return acc; }, {})}
              highlightPoint={selectedFrom || drawing?.fromId}
              onPointClick={handlePointClick}
              interactive={!animating && !allDone}
            >
              {/* Drawing preview line */}
              {drawLineCoords && (
                <line x1={drawLineCoords.x1} y1={drawLineCoords.y1} x2={drawLineCoords.x2} y2={drawLineCoords.y2}
                  stroke="#5C3A21" strokeWidth="3" strokeDasharray="8 4" opacity="0.6" />
              )}
              {/* Animation dot */}
              {animating && (
                <circle cx={dotX} cy={dotY} r={8}
                  fill={animPhaseIdx >= 0 ? PHASE_ANIM[animPhaseIdx]?.getState(animProgress).temp > 20 ? '#F97316' : '#60A5FA' : '#60A5FA'}
                  stroke="white" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }} />
              )}
            </HLogPDiagram>

            {/* Process animation panel — overlay top-left inside diagram */}
            {animating && animPhaseIdx >= 0 && (
              <div className="absolute top-2 left-2 z-10" style={{ animation: 'fadeInUp 0.3s' }}>
                <ProcessPanel progress={animProgress} phaseIndex={animPhaseIdx} />
              </div>
            )}
          </div>

          {animating && animPhaseIdx >= 0 && (
            <p className="text-xs italic text-center mt-2 mb-2" style={{ color: '#5C3A21' }}>
              {M2R3_PHASES[animPhaseIdx]?.tooltip}
            </p>
          )}

          {flashWrong && (
            <div className="p-2 text-white rounded-xl text-sm text-center italic mb-3 mt-3" style={{ background: '#B84A3D', animation: 'shake 0.3s' }}>
              Dat is niet de juiste verbinding. Lees de omschrijving nog eens!
            </div>
          )}

          {allDone && !animating && (
            <div className="mt-4">
              <div className="p-3 text-white rounded-xl text-sm italic mb-3" style={{ background: '#6B8E3D' }}>
                Het bootje is compleet. Je hebt niet alleen geleerd waar de punten liggen, maar ook wat er in elke stap van het proces gebeurt. Goed gedaan!
              </div>
              <button onClick={() => onComplete(points)}
                className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
                Volgende <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// M2R4 — SUPERHEAT & SUBCOOL
// ═══════════════════════════════════════════════════════════════

function SuperheatSubcool({ onComplete, onLoseLife, lives }) {
  const [step, setStep] = useState(0); // 0=ask3', 1=anim_cond, 2=ask1', 3=anim_evap, 4=done
  const [animProgress, setAnimProgress] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [points, setPoints] = useState(0);
  const [placedPrimes, setPlacedPrimes] = useState([]); // which prime points are placed
  const [readyPhase, setReadyPhase] = useState(null); // 0 or 1: show "Goed!" message before animation
  const animRef = useRef(null);
  const svgRef = useRef(null);

  const currentPhase = step === 1 ? 0 : step === 3 ? 1 : null; // which OVH_NAK_PHASES
  const isAnimating = step === 1 || step === 3;
  const showReady = readyPhase !== null;

  const getSvgCoords = (clientX, clientY) => {
    const svg = svgRef.current?.querySelector('svg') || svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      xPct: ((clientX - rect.left) / rect.width * SVG_W - PLOT.left) / PLOT_W * 100,
      yPct: (PLOT.bottom - (clientY - rect.top) / rect.height * SVG_H) / PLOT_H * 100,
    };
  };

  const handleDiagramClick = (e) => {
    if (isAnimating || step === 4 || showReady) return;

    const coords = getSvgCoords(e.clientX, e.clientY);
    if (!coords) return;

    if (step === 0) {
      // Asking for point 3' — on condenser line, near liquid line crossing
      const target = SUBCOOL_POINT;
      if (Math.abs(coords.xPct - target.xPct) < 10 && Math.abs(coords.yPct - target.yPct) < 10) {
        setPlacedPrimes(prev => [...prev, "3'"]);
        setPoints(p => p + SCORING.m2r4_point);
        setFeedback(null);
        setReadyPhase(0); // show "Goed!" message before animation
      } else {
        setFeedback('Klik op de plek waar de condensorlijn (2→3) de vloeistoflijn kruist.');
        onLoseLife?.();
        setTimeout(() => setFeedback(null), 2500);
      }
    } else if (step === 2) {
      // Asking for point 1' — on evaporator line, near vapor line crossing
      const target = SUPERHEAT_POINT;
      if (Math.abs(coords.xPct - target.xPct) < 10 && Math.abs(coords.yPct - target.yPct) < 10) {
        setPlacedPrimes(prev => [...prev, "1'"]);
        setPoints(p => p + SCORING.m2r4_point);
        setFeedback(null);
        setReadyPhase(1);
      } else {
        setFeedback('Klik op de plek waar de verdamperlijn (4→1) de damplijn kruist.');
        onLoseLife?.();
        setTimeout(() => setFeedback(null), 2500);
      }
    }
  };

  const handleStartAnimation = () => {
    const phase = readyPhase;
    setReadyPhase(null);
    startAnimation(phase);
  };

  const startAnimation = (phaseIdx) => {
    const animStep = phaseIdx === 0 ? 1 : 3;
    setStep(animStep);
    setAnimProgress(0);
    const startTime = Date.now();
    const duration = 5000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setAnimProgress(progress);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          if (animStep === 1) setStep(2); // go to ask for point 1'
          else setStep(4); // done
        }, 2000);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // Dot position during animation
  let dotX = 0, dotY = 0;
  if (isAnimating && currentPhase !== null) {
    const phase = OVH_NAK_PHASES[currentPhase];
    const fromPt = phase.from, toPt = phase.to;
    dotX = pctToX(fromPt.xPct) + (pctToX(toPt.xPct) - pctToX(fromPt.xPct)) * animProgress;
    dotY = pctToY(fromPt.yPct) + (pctToY(toPt.yPct) - pctToY(fromPt.yPct)) * animProgress;
  }

  const stepTexts = [
    { title: 'Nakoeling — Punt 3\' aanwijzen', desc: 'Het koudemiddel stroomt door de condensor van punt 2 naar punt 3. Wijs aan waar het door de vloeistoflijn gaat.' },
    null, // animation
    { title: 'Oververhitting — Punt 1\' aanwijzen', desc: 'Het koudemiddel stroomt door de verdamper van punt 4 naar punt 1. Wijs aan waar het door de damplijn gaat.' },
    null, // animation
  ];
  const currentText = step < 4 ? stepTexts[step] : null;

  return (
    <div className="min-h-screen p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-3xl mx-auto" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <div className="bg-white rounded-2xl p-6" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 className="text-lg font-extrabold mb-1" style={{ color: '#2C1810' }}>Oververhitting & nakoeling</h3>

          {/* Instruction */}
          {currentText && !showReady && (
            <div className="p-3 rounded-lg text-sm mb-4" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid #FBBF24', color: '#2C1810', animation: 'fadeInUp 0.3s' }}>
              <p className="font-bold mb-1">{currentText.title}</p>
              <p>{currentText.desc}</p>
            </div>
          )}

          {/* "Goed!" ready message before animation */}
          {showReady && (
            <div className="p-3 rounded-lg text-sm mb-4" style={{ background: 'rgba(107,142,61,0.12)', border: '1px solid #6B8E3D', color: '#2C1810', animation: 'fadeInUp 0.3s' }}>
              <p className="mb-2">
                <span className="font-extrabold">Goed!</span> Gebied {readyPhase === 0 ? "3' en 3" : "1' – 1"} = de {readyPhase === 0 ? 'nakoeling' : 'oververhitting'}.
              </p>
              <p className="mb-3">Let goed op wat er met de <strong>temperatuur</strong> en <strong>fase</strong> gebeurt{readyPhase === 0 ? '!' : '.'}</p>
              <button onClick={handleStartAnimation}
                className="w-full py-2 text-white rounded-lg font-bold italic hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: '#6B8E3D', border: '2px solid #2C1810', boxShadow: '0 3px 0 #4a6b2a' }}>
                Start animatie <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Animation explanation */}
          {isAnimating && currentPhase !== null && (
            <div className="p-3 rounded-lg text-sm mb-4 italic" style={{ background: '#FAFAF5', border: '1px solid #e8e0c8', color: '#5C3A21' }}>
              {OVH_NAK_PHASES[currentPhase].description}
            </div>
          )}

          {/* Diagram */}
          <div className="relative" ref={svgRef} onClick={handleDiagramClick} style={{ cursor: (!isAnimating && step !== 4) ? 'crosshair' : 'default' }}>
            <HLogPDiagram
              points={BOOTJE_POINTS}
              lines={BOOTJE_LINES}
              componentLabels={{ compressor: true, condensor: true, expansieventiel: true, verdamper: true }}
            >
              {/* Prime points (3' and 1') */}
              {placedPrimes.includes("3'") && (
                <g>
                  <circle cx={pctToX(SUBCOOL_POINT.xPct)} cy={pctToY(SUBCOOL_POINT.yPct)} r={10} fill="white" stroke={SUBCOOL_POINT.color} strokeWidth="2.5" />
                  <text x={pctToX(SUBCOOL_POINT.xPct)} y={pctToY(SUBCOOL_POINT.yPct) + 4} textAnchor="middle" fontSize="9" fill={SUBCOOL_POINT.color} fontWeight="bold" fontFamily="Nunito">3'</text>
                  {/* Nakoeling label */}
                  <text x={pctToX(SUBCOOL_POINT.xPct)} y={pctToY(SUBCOOL_POINT.yPct) - 14} textAnchor="middle" fontSize="8" fill={SUBCOOL_POINT.color} fontWeight="bold" fontFamily="Nunito">Nakoeling</text>
                </g>
              )}
              {placedPrimes.includes("1'") && (
                <g>
                  <circle cx={pctToX(SUPERHEAT_POINT.xPct)} cy={pctToY(SUPERHEAT_POINT.yPct)} r={10} fill="white" stroke={SUPERHEAT_POINT.color} strokeWidth="2.5" />
                  <text x={pctToX(SUPERHEAT_POINT.xPct)} y={pctToY(SUPERHEAT_POINT.yPct) + 4} textAnchor="middle" fontSize="9" fill={SUPERHEAT_POINT.color} fontWeight="bold" fontFamily="Nunito">1'</text>
                  {/* Oververhitting label */}
                  <text x={pctToX(SUPERHEAT_POINT.xPct)} y={pctToY(SUPERHEAT_POINT.yPct) - 14} textAnchor="middle" fontSize="8" fill={SUPERHEAT_POINT.color} fontWeight="bold" fontFamily="Nunito">Oververhitting</text>
                </g>
              )}

              {/* Animation dot */}
              {isAnimating && currentPhase !== null && (
                <circle cx={dotX} cy={dotY} r={8}
                  fill={OVH_NAK_PHASES[currentPhase].getState(animProgress).temp > 20 ? '#F97316' : '#60A5FA'}
                  stroke="white" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }} />
              )}
            </HLogPDiagram>

            {/* ProcessPanel overlay */}
            {isAnimating && currentPhase !== null && (
              <div className="absolute top-2 left-2 z-10" style={{ animation: 'fadeInUp 0.3s' }}>
                <ProcessPanel progress={animProgress} phaseIndex={-1} customState={OVH_NAK_PHASES[currentPhase].getState(animProgress)} />
              </div>
            )}
          </div>

          {/* Explanation after animation */}
          {isAnimating && currentPhase !== null && (
            <p className="text-xs italic text-center mt-2" style={{ color: '#5C3A21' }}>
              {OVH_NAK_PHASES[currentPhase].getState(animProgress).label}
            </p>
          )}

          {feedback && (
            <div className="p-2 text-white rounded-xl text-sm text-center italic mt-3" style={{ background: '#B84A3D' }}>{feedback}</div>
          )}

          {step === 4 && (
            <div className="mt-4">
              <div className="p-3 text-white rounded-xl text-sm italic mb-3" style={{ background: '#6B8E3D' }}>
                Goed gedaan! Je kent nu oververhitting en nakoeling. Oververhitting beschermt de compressor tegen vloeistofslag. Nakoeling voorkomt flashgas in de vloeistofleiding voor het expansieventiel.
              </div>
              <button onClick={() => onComplete(points)}
                className="w-full py-3 text-white rounded-xl font-bold italic hover:brightness-90 active:scale-95 flex items-center justify-center gap-2"
                style={{ background: '#5C3A21', border: '2px solid #2C1810', boxShadow: '0 3px 0 #3d2615' }}>
                Volgende <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// END SCREEN
// ═══════════════════════════════════════════════════════════════

function EndScreen({ score, onRestart }) {
  const stars = score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-md text-center" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
        {/* Medal */}
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full mb-4 text-6xl"
          style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', border: '4px solid #2C1810', boxShadow: '0 8px 24px rgba(251,191,36,0.4)' }}>
          &#127942;
        </div>
        <h2 className="text-3xl font-extrabold mb-2" style={{ color: '#2C1810' }}>Gefeliciteerd!</h2>

        {/* Score card */}
        <div className="bg-white rounded-2xl p-6 mb-4" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div className="text-4xl mb-2">
            {[1, 2, 3].map(s => <span key={s} className="mx-1" style={{ color: s <= stars ? '#FBBF24' : '#ccc' }}>&#9733;</span>)}
          </div>
          <p className="text-2xl font-extrabold mb-1" style={{ color: '#2C1810' }}>{score} / 100 punten</p>
          <p className="text-sm italic" style={{ color: '#5C3A21' }}>
            {stars === 3 ? 'Uitstekend!' : stars === 2 ? 'Goed gedaan!' : stars === 1 ? 'Aardig werk!' : 'Blijf oefenen!'}
          </p>
        </div>

        {/* Learning summary */}
        <div className="rounded-2xl p-5 mb-6 text-left" style={{ background: 'rgba(107,142,61,0.1)', border: '2px solid #6B8E3D' }}>
          <p className="text-sm italic leading-relaxed" style={{ color: '#2C1810' }}>
            Je hebt het bootje compleet in beeld. Je weet nu: een manometer leest effectief, maar in het h-log p diagram werk je altijd met <span className="inline-block px-2 py-0.5 font-bold rounded" style={{ background: '#FBBF24', color: '#2C1810' }}>absolute druk</span>. Tel er 1 bar bij op! En je kent de vier hoofdcomponenten: compressor, condensor, expansieventiel en verdamper.
          </p>
        </div>

        <button onClick={onRestart}
          className="px-10 py-4 text-white rounded-2xl font-extrabold italic text-lg hover:brightness-90 active:scale-95 flex items-center justify-center gap-2 mx-auto"
          style={{ background: '#5C3A21', border: '3px solid #2C1810', boxShadow: '0 4px 0 #3d2615' }}>
          <RotateCcw size={18} /> Opnieuw spelen
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN GAME COMPONENT
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// GAME OVER SCREEN
// ═══════════════════════════════════════════════════════════════

function GameOverScreen({ score, onRestart }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5EDD6' }}>
      <div className="max-w-md text-center" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
        <div className="flex justify-center gap-1 mb-4">
          {[1,2,3,4,5].map(i => <Heart key={i} className="w-8 h-8" fill="transparent" stroke="#ccc" style={{ opacity: 0.3 }} />)}
        </div>
        <h2 className="text-3xl font-extrabold mb-2" style={{ color: '#B84A3D' }}>Game Over</h2>
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '2px solid #2C1810', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <p className="italic mb-2" style={{ color: '#5C3A21' }}>Je hebt geen levens meer.</p>
          <p className="text-lg font-bold" style={{ color: '#2C1810' }}>Score: {score} / 100</p>
        </div>
        <button onClick={onRestart}
          className="px-10 py-4 text-white rounded-2xl font-extrabold italic text-lg hover:brightness-90 active:scale-95 flex items-center justify-center gap-2 mx-auto"
          style={{ background: '#5C3A21', border: '3px solid #2C1810', boxShadow: '0 4px 0 #3d2615' }}>
          <RotateCcw size={18} /> Opnieuw proberen
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN GAME COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function BootjeGame() {
  const [screen, setScreen] = useState('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [debugVisible, setDebugVisible] = useState(false);

  // Ctrl+D debug nav
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDebugVisible(v => !v);
      }
      if (e.key === 'Escape' && debugVisible) {
        setDebugVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [debugVisible]);

  // Prepare quiz questions when entering a _check screen
  // Mission 1 + m2r1: 1 random question. m2r3/m2r4: all 3 questions sequentially.
  useEffect(() => {
    if (screen.endsWith('_check') && ITEMBANKS[screen]) {
      const multiQuestionScreens = ['m2r3_check', 'm2r4_check'];
      if (multiQuestionScreens.includes(screen)) {
        setQuizQuestion(prepareAllQuestions(ITEMBANKS[screen]));
      } else {
        setQuizQuestion([pickRandomQuestion(ITEMBANKS[screen])]);
      }
    }
  }, [screen]);

  // Refill lives at the start of each new round (not checks)
  useEffect(() => {
    const roundScreens = ['m1r1', 'm1r2', 'm1r3', 'm2r1', 'm2r3', 'm2r4'];
    if (roundScreens.includes(screen)) {
      setLives(5);
    }
  }, [screen]);

  const goToScreen = (s) => setScreen(s);
  const addScore = (pts) => setScore(prev => prev + pts);

  const loseLife = useCallback(() => {
    setLives(prev => {
      const newLives = Math.max(0, prev - 1);
      if (newLives === 0) {
        setTimeout(() => setScreen('game_over'), 800);
      }
      return newLives;
    });
  }, []);

  const handleRoundComplete = (nextScreen) => (pts) => {
    addScore(pts);
    goToScreen(nextScreen);
  };

  const handleQuizComplete = (nextScreen) => (pts) => {
    addScore(pts);
    goToScreen(nextScreen);
  };

  const handleRestart = () => {
    setScore(0);
    setLives(5);
    setQuizQuestion(null);
    goToScreen('start');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'start':
        return <StartScreen onStart={() => goToScreen('m1_intro')} />;
      case 'm1_intro':
        return <M1IntroScreen onBegin={() => goToScreen('m1r1')} />;
      case 'm1r1':
        return <BikeScene onComplete={handleRoundComplete('m1r1_check')} onLoseLife={loseLife} lives={lives} />;
      case 'm1r1_check':
        return quizQuestion ? (
          <div className="min-h-screen p-4 pt-16" style={{ background: '#F5EDD6' }}>
            <QuizCheck quizQs={quizQuestion} maxPoints={SCORING.m1r1_check} onComplete={handleQuizComplete('m1r2')} onLoseLife={loseLife} lives={lives} />
          </div>
        ) : null;
      case 'm1r2':
        return <SortingGame onComplete={handleRoundComplete('m1r2_check')} onLoseLife={loseLife} lives={lives} />;
      case 'm1r2_check':
        return quizQuestion ? (
          <div className="min-h-screen p-4 pt-16" style={{ background: '#F5EDD6' }}>
            <QuizCheck quizQs={quizQuestion} maxPoints={SCORING.m1r2_check} onComplete={handleQuizComplete('m1r3')} onLoseLife={loseLife} lives={lives} />
          </div>
        ) : null;
      case 'm1r3':
        return <ConversionPanel onComplete={handleRoundComplete('m1r3_check')} onLoseLife={loseLife} lives={lives} />;
      case 'm1r3_check':
        return quizQuestion ? (
          <div className="min-h-screen p-4 pt-16" style={{ background: '#F5EDD6' }}>
            <QuizCheck quizQs={quizQuestion} maxPoints={SCORING.m1r3_check} onComplete={handleQuizComplete('m2_intro')} onLoseLife={loseLife} lives={lives} />
          </div>
        ) : null;
      case 'm2_intro':
        return <M2IntroScreen onBegin={() => goToScreen('m2r1')} />;
      case 'm2r1':
        return <ComponentPlacer onComplete={handleRoundComplete('m2r1_check')} onLoseLife={loseLife} lives={lives} />;
      case 'm2r1_check':
        return quizQuestion ? (
          <div className="min-h-screen p-4 pt-16" style={{ background: '#F5EDD6' }}>
            <QuizCheck quizQs={quizQuestion} maxPoints={SCORING.m2r1_check} onComplete={handleQuizComplete('m2r3')} onLoseLife={loseLife} lives={lives} />
          </div>
        ) : null;
      case 'm2r3':
        return <LineConnector onComplete={handleRoundComplete('m2r3_check')} onLoseLife={loseLife} lives={lives} />;
      case 'm2r3_check':
        return quizQuestion ? (
          <div className="min-h-screen p-4 pt-16" style={{ background: '#F5EDD6' }}>
            <QuizCheck quizQs={quizQuestion} maxPoints={SCORING.m2r3_check} onComplete={handleQuizComplete('m2r4')} onLoseLife={loseLife} lives={lives} />
          </div>
        ) : null;
      case 'm2r4':
        return <SuperheatSubcool onComplete={handleRoundComplete('m2r4_check')} onLoseLife={loseLife} lives={lives} />;
      case 'm2r4_check':
        return quizQuestion ? (
          <div className="min-h-screen p-4 pt-16" style={{ background: '#F5EDD6' }}>
            <QuizCheck quizQs={quizQuestion} maxPoints={SCORING.m2r4_check} onComplete={handleQuizComplete('end')} onLoseLife={loseLife} lives={lives} />
          </div>
        ) : null;
      case 'end':
        return <EndScreen score={score} onRestart={handleRestart} />;
      case 'game_over':
        return <GameOverScreen score={score} onRestart={handleRestart} />;
      default:
        return <StartScreen onStart={() => goToScreen('m1_intro')} />;
    }
  };

  const showProgress = screen !== 'start' && screen !== 'end' && screen !== 'game_over';

  return (
    <div className="relative min-h-screen" style={{ background: '#F5EDD6' }}>
      {showProgress && <ProgressBar screen={screen} lives={lives} score={score} />}
      {renderScreen()}
      <DebugNav visible={debugVisible} currentScreen={screen} onNavigate={goToScreen} onClose={() => setDebugVisible(false)} />
    </div>
  );
}
