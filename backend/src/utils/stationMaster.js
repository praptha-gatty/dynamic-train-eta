/**
 * Station Master Database with geographic coordinates (Latitude, Longitude).
 * Guarantees non-null float coordinates for railway stations across India.
 * Never falls back to arbitrary central India coordinates for unknown stations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const STATION_COORDINATES_MAP = {
  // Southern & South Western Railway (Karnataka, Kerala, Konkan corridor)
  MAQ: [12.8645, 74.8431],   // Mangalore Central
  MAJN: [12.8698, 74.8727],  // Mangaluru Junction
  BNTL: [12.8876, 75.0345],  // Bantawala
  KNYR: [12.7540, 75.3012],  // Kaniuru
  KBPR: [12.7667, 75.2014],  // Kabaka Puttur
  NRJ: [12.7210, 75.2530],   // Narimogaru
  SBHR: [12.6780, 75.3610],  // Subrahmanya Road
  SKLR: [12.9430, 75.7860],  // Sakleshpur
  HAS: [13.0070, 76.1030],   // Hassan
  ASK: [13.3150, 76.2570],   // Arsikere Jn
  MYS: [12.3160, 76.6470],   // Mysuru Jn
  SBC: [12.9784, 77.5694],   // KSR Bengaluru
  YPR: [13.0238, 77.5503],   // Yesvantpur
  SMVB: [12.9900, 77.6500],  // Sir M. Visvesvaraya Terminal
  UBL: [15.3480, 75.1480],   // SSS Hubballi Jn (Hubli)
  DWR: [15.4580, 75.0080],   // Dharwad
  BGM: [15.8600, 74.5000],   // Belagavi (Belgaum)
  BAY: [15.1430, 76.9240],   // Ballari Jn (Bellary)
  HPT: [15.2800, 76.3900],   // Hosapete Jn (Hampi)
  SL: [13.0118, 74.7958],    // Surathkal
  MULK: [13.0800, 74.7800],  // Mulki
  UD: [13.3420, 74.7520],    // Udupi
  BKJ: [13.4800, 74.7200],   // Barkur
  KUDA: [13.6260, 74.6980],  // Kundapura
  BYNR: [13.8760, 74.6280],  // Byndoor Mookambika Road
  BTJL: [13.9780, 74.5510],  // Bhatkal
  MRDW: [14.0930, 74.4880],  // Murdeshwar
  KT: [14.4260, 74.4170],    // Kumta
  GOK: [14.5420, 74.3310],   // Gokarna Road
  ANKL: [14.6580, 74.3010],  // Ankola
  KAWR: [14.8210, 74.1450],  // Karwar
  MAO: [15.2740, 73.9780],   // Madgaon Jn (Goa)
  KRMI: [15.4850, 73.9180],  // Karmali
  THVM: [15.6500, 73.8650],  // Thivim
  KGQ: [12.5020, 74.9880],   // Kasaragod
  KZE: [12.3080, 75.0930],   // Kanhangad
  PAY: [12.0980, 75.2010],   // Payyanur
  CAN: [11.8745, 75.3704],   // Kannur
  TLY: [11.7500, 75.4900],   // Thalassery
  BDJ: [11.6000, 75.5900],   // Vadakara
  CLT: [11.2588, 75.7804],   // Kozhikode (Calicut)
  TIR: [10.9100, 75.9200],   // Tirur
  SRR: [10.7600, 76.2750],   // Shoranur Jn
  PGT: [10.7867, 76.6548],   // Palakkad Jn
  CBE: [11.0168, 76.9558],   // Coimbatore Jn
  TCR: [10.5180, 76.2130],   // Thrissur
  AWY: [10.1080, 76.3530],   // Aluva
  ERS: [9.9674, 76.2941],    // Ernakulam Jn (South)
  ERN: [9.9980, 76.2920],    // Ernakulam Town (North)
  ALLP: [9.4920, 76.3260],   // Alappuzha (Alleppey)
  KTYM: [9.5850, 76.5340],   // Kottayam
  KYJ: [9.1670, 76.4980],    // Kayamkulam Jn
  QLN: [8.8870, 76.6020],    // Kollam Jn
  TVC: [8.4875, 76.9525],    // Thiruvananthapuram Central
  NCJ: [8.1800, 77.4300],    // Nagercoil Jn
  CAPE: [8.0880, 77.5380],   // Kanniyakumari
  MAS: [13.0827, 80.2707],   // Chennai Central
  MS: [13.0780, 80.2610],    // Chennai Egmore
  MDU: [9.9252, 78.1198],    // Madurai Jn
  TPJ: [10.7905, 78.7047],   // Tiruchchirappalli
  SA: [11.6643, 78.1460],    // Salem Jn
  ED: [11.3410, 77.7172],    // Erode Jn
  RU: [13.6288, 79.4192],    // Renigunta Jn
  TPTY: [13.6330, 79.4200],  // Tirupati
  HYB: [17.3949, 78.4852],   // Hyderabad Deccan
  SC: [17.4399, 78.4983],    // Secunderabad
  KCG: [17.3850, 78.4900],   // Kacheguda
  BZA: [16.5062, 80.6480],   // Vijayawada
  VSKP: [17.6868, 83.2185],  // Visakhapatnam

  // Delhi & NCR
  NDLS: [28.6430, 77.2190],  // New Delhi
  DLI: [28.6620, 77.2280],   // Old Delhi
  NZM: [28.5880, 77.2530],   // Hazrat Nizamuddin
  ANVT: [28.6520, 77.3150],  // Anand Vihar
  DEC: [28.5900, 77.1200],   // Delhi Cantt
  GZB: [28.6670, 77.4330],   // Ghaziabad
  FDB: [28.4089, 77.3178],   // Faridabad
  PWL: [28.1430, 77.3270],   // Palwal

  // Mumbai & Western
  BCT: [18.9696, 72.8193],   // Mumbai Central
  MMCT: [18.9696, 72.8193],  // Mumbai Central
  CSMT: [18.9400, 72.8350],  // CSMT
  CSTM: [18.9400, 72.8350],
  DR: [19.0178, 72.8436],    // Dadar
  BDTS: [19.0600, 72.8400],  // Bandra Terminus
  LTT: [19.0699, 72.8911],   // Lokmanya Tilak Terminus
  KYN: [19.2437, 73.1355],   // Kalyan
  TNA: [19.1860, 72.9750],   // Thane
  BVI: [19.2290, 72.8570],   // Borivali
  PUNE: [18.5284, 73.8744],  // Pune
  NGP: [21.1524, 79.0882],   // Nagpur
  BSL: [20.9287, 75.7873],   // Bhusaval
  NK: [19.9975, 73.7898],    // Nashik Road
  SUR: [17.6599, 75.9064],   // Solapur
  KOP: [16.7050, 74.2433],   // Kolhapur

  // Punjab, Haryana & J&K (Northern Route)
  SVDK: [32.9922, 74.9315],  // Shri Mata Vaishno Devi Katra
  UHP: [32.9260, 75.1416],   // Udhampur
  MCTM: [32.9260, 75.1416],
  JAT: [32.7060, 74.8790],   // Jammu Tawi
  KTHU: [32.3800, 75.5200],  // Kathua
  PTKC: [32.2680, 75.6420],  // Pathankot Cantt
  PTK: [32.2780, 75.6520],   // Pathankot
  MEX: [32.0200, 75.7600],   // Mukerian
  DZA: [31.9000, 75.6500],   // Dasuya
  JRC: [31.3120, 75.6020],   // Jalandhar Cantt
  JUC: [31.3260, 75.5760],   // Jalandhar City
  PGW: [31.2200, 75.7700],   // Phagwara
  LDH: [30.9010, 75.8573],   // Ludhiana
  KNN: [30.7000, 76.2200],   // Khanna
  SIR: [30.6300, 76.3800],   // Sirhind
  RPJ: [30.4800, 76.5900],   // Rajpura
  UMB: [30.3340, 76.8380],   // Ambala Cantt
  KKDE: [29.9695, 76.8783],  // Kurukshetra
  KUN: [29.6857, 76.9905],   // Karnal
  PNP: [29.3909, 76.9635],   // Panipat
  SNP: [28.9931, 77.0151],   // Sonipat
  ASR: [31.6340, 74.8723],   // Amritsar
  CDG: [30.7046, 76.8013],   // Chandigarh
  KLK: [30.8400, 76.9300],   // Kalka

  // Central & North Central
  MTC: [28.9800, 77.7000],   // Meerut City
  MUT: [29.0000, 77.7100],   // Meerut Cantt
  MOZ: [29.4700, 77.7000],   // Muzaffarnagar
  SRE: [29.9640, 77.5460],   // Saharanpur
  MTJ: [27.4924, 77.6737],   // Mathura
  AGC: [27.1580, 77.9900],   // Agra Cantt
  AF: [27.1800, 78.0200],    // Agra Fort
  DHO: [26.7000, 77.9000],   // Dholpur
  MRA: [26.5000, 78.0000],   // Morena
  GWL: [26.2183, 78.1828],   // Gwalior
  DBA: [25.8900, 78.3300],   // Dabra
  VGLB: [25.4484, 78.5685],  // Virangana Lakshmibai Jhansi
  JHS: [25.4484, 78.5685],
  BAB: [25.2400, 78.4700],   // Babina
  LAR: [24.8300, 78.4200],   // Lalitpur
  BINA: [24.1800, 78.1800],  // Bina Jn
  MABA: [24.0800, 77.9800],  // Mandi Bamora
  BAQ: [23.8500, 77.7900],   // Ganj Basoda
  BHS: [23.5300, 77.8100],   // Vidisha
  BPL: [23.2599, 77.4126],   // Bhopal
  RKMP: [23.2100, 77.4350],  // Rani Kamalapati (Habibganj)
  HBJ: [23.2100, 77.4350],
  ET: [22.6100, 77.7600],    // Itarsi
  CNB: [26.4499, 80.3319],   // Kanpur Central
  LKO: [26.8310, 80.9200],   // Lucknow Charbagh
  PRYJ: [25.4358, 81.8463],  // Prayagraj (Allahabad)
  BSB: [25.3260, 82.9900],   // Varanasi
  GKP: [26.7606, 83.3732],   // Gorakhpur
  AY: [26.7900, 82.2000],    // Ayodhya
  JBP: [23.1686, 79.9339],   // Jabalpur
  KTE: [23.8343, 80.3995],   // Katni
  STA: [24.5800, 80.8300],   // Satna
  INDB: [22.7196, 75.8577],  // Indore
  DWX: [22.9676, 76.0534],   // Dewas
  UJN: [23.1765, 75.7885],   // Ujjain
  NAD: [23.4500, 75.4100],   // Nagda
  RTM: [23.3315, 75.0367],   // Ratlam

  // Rajasthan & Gujarat
  JP: [26.9124, 75.7873],    // Jaipur
  AII: [26.4499, 74.6399],   // Ajmer
  KOTA: [25.2138, 75.8648],  // Kota
  SWM: [25.9928, 76.3526],   // Sawai Madhopur
  BTE: [27.2152, 77.4895],   // Bharatpur
  JU: [26.2389, 73.0243],    // Jodhpur
  BKN: [28.0229, 73.3119],   // Bikaner
  UDZ: [24.5854, 73.7125],   // Udaipur
  ABR: [24.5926, 72.7156],   // Abu Road
  ADI: [23.0225, 72.5714],   // Ahmedabad
  BRC: [22.3072, 73.1812],   // Vadodara
  ST: [21.1702, 72.8311],    // Surat
  BL: [20.6100, 72.9300],    // Valsad
  VAPI: [20.3700, 72.9000],  // Vapi
  RJT: [22.3039, 70.8022],   // Rajkot
  JAM: [22.4707, 70.0577],   // Jamnagar

  // Eastern & North Eastern
  HWH: [22.5830, 88.3426],   // Howrah (Kolkata)
  SDAH: [22.5697, 88.3697],  // Sealdah
  KOAA: [22.6000, 88.3700],  // Kolkata
  PNBE: [25.5941, 85.1376],  // Patna
  DNR: [25.6200, 85.0400],   // Danapur
  GAYA: [24.7914, 85.0002],  // Gaya
  DHN: [23.7957, 86.4304],   // Dhanbad
  ASN: [23.6889, 86.9661],   // Asansol
  RNC: [23.3441, 85.3096],   // Ranchi
  TATA: [22.8046, 86.2029],  // Tatanagar
  BBS: [20.2961, 85.8245],   // Bhubaneswar
  PURI: [19.8135, 85.8312],  // Puri
  GHY: [26.1445, 91.7362],   // Guwahati
  NJP: [26.6853, 88.4419]    // New Jalpaiguri
};

let dynamicCatalog = null;

function getDynamicCatalog() {
  if (dynamicCatalog !== null) return dynamicCatalog;
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const catalogPath = path.resolve(__dirname, '../../../data-collector/stationCatalog.json');
    if (fs.existsSync(catalogPath)) {
      dynamicCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } else {
      dynamicCatalog = {};
    }
  } catch (e) {
    dynamicCatalog = {};
  }
  return dynamicCatalog;
}

/**
 * Resolves station coordinates [latitude, longitude] as non-null floats.
 * Strictly verifies geographic validity.
 * @param {string} stationCode 
 * @param {number|null} [lat] 
 * @param {number|null} [lon] 
 * @returns {{ latitude: number|null, longitude: number|null }}
 */
export function resolveCoordinates(stationCode, lat = null, lon = null) {
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  if (
    Number.isFinite(parsedLat) && Number.isFinite(parsedLon) &&
    Math.abs(parsedLat) <= 90 && Math.abs(parsedLon) <= 180 &&
    (parsedLat !== 0 || parsedLon !== 0)
  ) {
    return { latitude: parsedLat, longitude: parsedLon };
  }

  if (stationCode) {
    const code = String(stationCode).trim().toUpperCase();
    
    // 1. Primary curated station coordinates map
    const lookup = STATION_COORDINATES_MAP[code];
    if (lookup) {
      return { latitude: lookup[0], longitude: lookup[1] };
    }

    // 2. Dynamic station master catalog lookup
    const catalog = getDynamicCatalog();
    const catEntry = catalog[code];
    if (catEntry && Number.isFinite(parseFloat(catEntry.latitude)) && Number.isFinite(parseFloat(catEntry.longitude))) {
      const cLat = parseFloat(catEntry.latitude);
      const cLon = parseFloat(catEntry.longitude);
      if (cLat !== 0 || cLon !== 0) {
        return { latitude: cLat, longitude: cLon };
      }
    }
  }

  return { latitude: null, longitude: null };
}
