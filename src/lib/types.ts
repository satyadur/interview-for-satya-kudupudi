export interface Launch {
  id: string;
  flight_number: number;
  date_utc: string;
  launchpad: string;
  name: string;
  success: boolean;
  upcoming: boolean;
  rocket: string;
  details: string | null;
  links: {
    patch: { small: string | null };
    article: string | null;
    wikipedia: string | null;
    webcast: string | null;
  };
  payloads: string[];
}

export interface Launchpad {
  id: string;
  full_name: string;
}

export interface Rocket {
  id: string;
  name: string;
  type: string;
  company: string;
  country: string;
}

export interface Payload {
  id: string;
  orbit: string | null;
}

export interface TableLaunch {
  id: number;
  launched: string;
  location: string;
  mission: string;
  orbit: string;
  status: string;
  rocket: string;
  rocket_type: string;
  company: string;
  rawData: Launch;
}
