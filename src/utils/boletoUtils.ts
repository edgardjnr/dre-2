export const normalizeDigits = (value: string): string => String(value || '').replace(/\D/g, '');

const modulo10DV = (value: string): number => {
  let sum = 0;
  let multiplier = 2;
  for (let i = value.length - 1; i >= 0; i--) {
    const n = parseInt(value[i], 10);
    const prod = n * multiplier;
    sum += prod > 9 ? prod - 9 : prod;
    multiplier = multiplier === 2 ? 1 : 2;
  }
  return (10 - (sum % 10)) % 10;
};

const modulo11BoletoDV = (barcode44: string): number => {
  let sum = 0;
  let weight = 2;
  for (let i = barcode44.length - 1; i >= 0; i--) {
    const n = parseInt(barcode44[i], 10);
    sum += n * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = sum % 11;
  const dv = 11 - mod;
  if (dv === 0 || dv === 10 || dv === 11) return 1;
  return dv;
};

export const linhaDigitavel47ToBarcode44 = (linha47: string): string => {
  const d = normalizeDigits(linha47);
  if (d.length !== 47) return '';
  const bankCurrency = d.slice(0, 4);
  const dvGeral = d[32];
  const fatorValor = d.slice(33, 47);
  const freeField = d.slice(4, 9) + d.slice(10, 20) + d.slice(21, 31);
  return bankCurrency + dvGeral + fatorValor + freeField;
};

export const isValidLinhaDigitavel47 = (linha47: string): boolean => {
  const d = normalizeDigits(linha47);
  if (d.length !== 47) return false;
  const field1 = d.slice(0, 9);
  const dv1 = parseInt(d[9], 10);
  const field2 = d.slice(10, 20);
  const dv2 = parseInt(d[20], 10);
  const field3 = d.slice(21, 31);
  const dv3 = parseInt(d[31], 10);
  if (modulo10DV(field1) !== dv1) return false;
  if (modulo10DV(field2) !== dv2) return false;
  if (modulo10DV(field3) !== dv3) return false;
  const barcode = linhaDigitavel47ToBarcode44(d);
  if (!barcode || barcode.length !== 44) return false;
  return isValidBarcode44(barcode);
};

export const isValidBarcode44 = (barcode44: string): boolean => {
  const d = normalizeDigits(barcode44);
  if (d.length !== 44) return false;
  if (!/^\d{44}$/.test(d)) return false;
  if (d[0] === '8') return true;
  const dv = parseInt(d[4], 10);
  const withoutDv = d.slice(0, 4) + '0' + d.slice(5);
  const expected = modulo11BoletoDV(withoutDv);
  return dv === expected;
};

export const barcode44ToLinhaDigitavel47 = (barcode44: string): string => {
  const d = normalizeDigits(barcode44);
  if (d.length !== 44) return '';
  const bankCurrency = d.slice(0, 4);
  const dvGeral = d[4];
  const fatorValor = d.slice(5, 19);
  const freeField = d.slice(19, 44);
  const campo1 = bankCurrency + freeField.slice(0, 5);
  const dv1 = modulo10DV(campo1);
  const campo2 = freeField.slice(5, 15);
  const dv2 = modulo10DV(campo2);
  const campo3 = freeField.slice(15, 25);
  const dv3 = modulo10DV(campo3);
  return `${campo1}${dv1}${campo2}${dv2}${campo3}${dv3}${dvGeral}${fatorValor}`;
};

