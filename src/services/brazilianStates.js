export const BRAZILIAN_STATES = Object.freeze([
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amap\u00e1' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Cear\u00e1' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Esp\u00edrito Santo' },
  { uf: 'GO', name: 'Goi\u00e1s' },
  { uf: 'MA', name: 'Maranh\u00e3o' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Par\u00e1' },
  { uf: 'PB', name: 'Para\u00edba' },
  { uf: 'PR', name: 'Paran\u00e1' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piau\u00ed' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rond\u00f4nia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'S\u00e3o Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' }
].map(state => Object.freeze(state)));

export const isBrazilianState = value => typeof value === 'string' &&
  BRAZILIAN_STATES.some(state => state.uf === value);
