export type StationId = 'descent' | 'enfleshing' | 'hiddenness' | 'opening' | 'closing';

export interface Station {
  id: StationId;
  kicker: string;
  spoken: string;
  paragraphs: string[];
}

export const STATIONS: Station[] = [
  {
    id: 'descent',
    kicker: 'DESCENT — κένωσις',
    spoken: 'Descent. Kenosis.',
    paragraphs: [
      'The emptying is not a metaphor. Heat leaves the hands. The jaw unclenches because there is nothing left to bite.',
      'What remains is a diameter.',
    ],
  },
  {
    id: 'enfleshing',
    kicker: 'ENFLESHING — σάρξ',
    spoken: 'Enfleshing. Sarx.',
    paragraphs: [
      'Flesh is the only instrument that can stop. The spine is a column. Weight goes into the heels.',
      'Blood is loud if you let it be.',
    ],
  },
  {
    id: 'hiddenness',
    kicker: 'HIDDENNESS',
    spoken: 'Hiddenness.',
    paragraphs: [
      'A cloister is a wall that keeps the world from rehearsing you. Sit where the light does not reach the face.',
      'Do not announce the sitting.',
    ],
  },
  {
    id: 'opening',
    kicker: 'OPENING — σπορά',
    spoken: 'Opening. Spora.',
    paragraphs: [
      'The seed is not an idea. It is a small hard thing put into dark.',
      'After that the work is weather.',
    ],
  },
  {
    id: 'closing',
    kicker: 'CLOSING',
    spoken: 'Put the machine down.',
    paragraphs: [
      'Put the machine down. Stand. Walk until you can name one object you did not bring with you.',
      'Then stay with it until it is only itself.',
    ],
  },
];
