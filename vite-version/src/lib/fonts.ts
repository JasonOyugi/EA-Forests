// Graphik-like typography configuration inspired by the Canals reference.
// Archivo is used as the licensed, open-source site-wide substitute.

export const canalsFontCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,100..900&display=swap');
`;

export const canalsFontVariable = '--font-canals';
export const canalsFontFamily = 'Archivo, "Helvetica Neue", Arial, sans-serif';

// Compatibility aliases for any downstream imports that still use the old names.
export const interFontCSS = canalsFontCSS;
export const interFontVariable = canalsFontVariable;
export const interFontFamily = canalsFontFamily;
