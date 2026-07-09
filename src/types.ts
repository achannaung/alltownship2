export interface Village {
  id: string;
  pcode: string;          // e.g. MM012045
  nameMm: string;         // Burmese name
  nameEn: string;         // English name
  tractMm: string;        // Village Tract Burmese name
  tractEn: string;        // Village Tract English name
  townshipMm: string;     // Township Burmese name
  townshipEn: string;     // Township English name
  stateMm: string;        // State/Region Burmese name
  stateEn: string;        // State/Region English name
  districtEn: string;     // District English name
  latitude: number;       // For coordinate details & map
  longitude: number;      // For coordinate details & map
  population: number;     // Estimated population
  households: number;     // Estimated households
  facilities: string[];   // e.g. ["School", "Clinic", "Water Well"]
}

export interface MonitorNote {
  villageId: string;
  note: string;
  updatedAt: string;
}

export interface FlaggedVillage {
  villageId: string;
  flaggedAt: string;
  status: 'pending' | 'monitored' | 'alert' | 'inactive';
}
