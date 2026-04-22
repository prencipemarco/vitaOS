/**
 * festivita.js — Italian public holidays + bridge day calculator
 */

// Gregorian algorithm for Easter Sunday
function getEaster(year) {
  const a = year % 19, b = Math.floor(year/100), c = year%100
  const d = Math.floor(b/4), e = b%4, f = Math.floor((b+8)/25)
  const g = Math.floor((b-f+1)/3)
  const h = (19*a+b-d-g+15)%30
  const i = Math.floor(c/4), k = c%4
  const l = (32+2*e+2*i-h-k)%7
  const m = Math.floor((a+11*h+22*l)/451)
  const month = Math.floor((h+l-7*m+114)/31)
  const day = ((h+l-7*m+114)%31)+1
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function addDays(dateStr, n) {
  const d = new Date(dateStr+'T12:00')
  d.setDate(d.getDate()+n)
  return d.toISOString().slice(0,10)
}

export const FESTIVITA_NOMI = {
  '01-01':'Capodanno','01-06':'Epifania','04-25':'Liberazione',
  '05-01':'Festa del Lavoro','06-02':'Festa della Repubblica',
  '08-15':'Ferragosto','11-01':'Ognissanti','12-08':'Immacolata',
  '12-25':'Natale','12-26':'Santo Stefano','easter':'Pasqua','easterM':'Lunedì di Pasqua',
}

export function getFestivita(year) {
  const easter = getEaster(year)
  const easterMonday = addDays(easter, 1)
  const fixed = [
    { data:`${year}-01-01`, nome:'Capodanno' },
    { data:`${year}-01-06`, nome:'Epifania' },
    { data:`${year}-04-25`, nome:'Liberazione' },
    { data:`${year}-05-01`, nome:'Festa del Lavoro' },
    { data:`${year}-06-02`, nome:'Festa della Repubblica' },
    { data:`${year}-08-15`, nome:'Ferragosto' },
    { data:`${year}-11-01`, nome:'Ognissanti' },
    { data:`${year}-12-08`, nome:'Immacolata' },
    { data:`${year}-12-25`, nome:'Natale' },
    { data:`${year}-12-26`, nome:'Santo Stefano' },
    { data:easter,         nome:'Pasqua' },
    { data:easterMonday,   nome:'Lunedì di Pasqua' },
  ]
  return fixed.sort((a,b)=>a.data.localeCompare(b.data))
}

export function isFestivita(dateStr, year) {
  return getFestivita(year).some(f => f.data === dateStr)
}

export function getFestivitaNome(dateStr, year) {
  return getFestivita(year).find(f => f.data === dateStr)?.nome || null
}

// Bridge days: if holiday is Tue → bridge Mon; if Thu → bridge Fri
export function getPonti(year) {
  const ponti = []
  const festivita = getFestivita(year)
  festivita.forEach(f => {
    const d = new Date(f.data+'T12:00')
    const dow = d.getDay() // 0=Sun,1=Mon,...,6=Sat
    if (dow === 2) { // Tuesday → take Monday
      ponti.push({ data:addDays(f.data,-1), festivita:f.nome, tipo:'ponte_lun', suggerimento:`Ponte consigliato: prendi lunedì ${addDays(f.data,-1).slice(8)} per collegare con ${f.nome}` })
    }
    if (dow === 4) { // Thursday → take Friday
      ponti.push({ data:addDays(f.data,1), festivita:f.nome, tipo:'ponte_ven', suggerimento:`Ponte consigliato: prendi venerdì ${addDays(f.data,1).slice(8)} per collegare con ${f.nome}` })
    }
  })
  return ponti
}
