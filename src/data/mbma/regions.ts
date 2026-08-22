/**
 * Northern / panhandle Florida FIPS — 36 counties, ~$55.6M YTD 2025.
 * Peninsula metros (Miami-Dade, Broward, Palm Beach, Hillsborough, etc.)
 * are out of the 600-mile radar and must not appear on this page.
 */

export const NORTH_FL_FIPS = new Set<string>([
  "12001", // Alachua
  "12003", // Baker
  "12005", // Bay
  "12007", // Bradford
  "12013", // Calhoun
  "12019", // Clay
  "12023", // Columbia
  "12029", // Dixie
  "12031", // Duval
  "12033", // Escambia
  "12035", // Flagler
  "12037", // Franklin
  "12039", // Gadsden
  "12041", // Gilchrist
  "12045", // Gulf
  "12047", // Hamilton
  "12059", // Holmes
  "12063", // Jackson
  "12065", // Jefferson
  "12067", // Lafayette
  "12073", // Leon
  "12075", // Levy
  "12077", // Liberty
  "12079", // Madison
  "12083", // Marion
  "12089", // Nassau
  "12091", // Okaloosa
  "12107", // Putnam
  "12109", // St. Johns
  "12113", // Santa Rosa
  "12121", // Suwannee
  "12123", // Taylor
  "12125", // Union
  "12129", // Wakulla
  "12131", // Walton
  "12133", // Washington
]);

export const BLOCKED_FL_FIPS = new Set<string>([
  "12086", // Miami-Dade
  "12011", // Broward
  "12099", // Palm Beach
  "12057", // Hillsborough
]);
