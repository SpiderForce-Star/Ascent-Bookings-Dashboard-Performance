/**
 * Regional quick-filters for the MBMA territory page.
 * FIPS lists are static; they do not change with the annual shipment file.
 */

/** Harris + surrounding Houston MSA and East Texas I-10 / Golden Triangle counties. */
export const EAST_TEXAS_HOUSTON_FIPS = new Set<string>([
  // Houston–Pasadena–The Woodlands MSA
  "48015", // Austin
  "48039", // Brazoria
  "48071", // Chambers
  "48157", // Fort Bend
  "48167", // Galveston
  "48201", // Harris
  "48291", // Liberty
  "48339", // Montgomery
  "48407", // San Jacinto
  "48471", // Walker
  "48473", // Waller
  // Adjacent Gulf / Brazos
  "48185", // Grimes
  "48089", // Colorado
  "48321", // Matagorda
  "48477", // Washington
  "48481", // Wharton
  // Beaumont–Port Arthur / East Texas Golden Triangle
  "48199", // Hardin
  "48241", // Jasper
  "48245", // Jefferson
  "48351", // Newton
  "48361", // Orange
  "48373", // Polk
  "48457", // Tyler
]);

/**
 * Northern Florida only: Panhandle + North Central + Northeast.
 * Excludes Central and South Florida (Tampa / Orlando / Miami metros).
 */
export const NORTHERN_FLORIDA_FIPS = new Set<string>([
  // Panhandle
  "12005", // Bay
  "12013", // Calhoun
  "12033", // Escambia
  "12037", // Franklin
  "12039", // Gadsden
  "12045", // Gulf
  "12059", // Holmes
  "12063", // Jackson
  "12073", // Leon
  "12077", // Liberty
  "12091", // Okaloosa
  "12113", // Santa Rosa
  "12129", // Wakulla
  "12131", // Walton
  "12133", // Washington
  // North Central
  "12001", // Alachua
  "12007", // Bradford
  "12023", // Columbia
  "12029", // Dixie
  "12041", // Gilchrist
  "12047", // Hamilton
  "12065", // Jefferson
  "12067", // Lafayette
  "12075", // Levy
  "12079", // Madison
  "12083", // Marion
  "12107", // Putnam
  "12121", // Suwannee
  "12123", // Taylor
  "12125", // Union
  // Northeast
  "12003", // Baker
  "12019", // Clay
  "12031", // Duval
  "12035", // Flagler
  "12089", // Nassau
  "12109", // St. Johns
]);
