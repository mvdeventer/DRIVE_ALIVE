/**
 * Comprehensive South African Location Data
 * Provinces, Cities, and Suburbs
 */

export interface Suburb {
  name: string;
  postalCode?: string;
}

export interface City {
  name: string;
  suburbs: Suburb[];
}

export interface Province {
  name: string;
  code: string;
  cities: City[];
}

/**
 * Complete South African location hierarchy
 */
export const SOUTH_AFRICAN_LOCATIONS: Province[] = [
  {
    name: 'Gauteng',
    code: 'GP',
    cities: [
      {
        name: 'Johannesburg',
        suburbs: [
          { name: 'Sandton', postalCode: '2196' },
          { name: 'Rosebank', postalCode: '2196' },
          { name: 'Bryanston', postalCode: '2021' },
          { name: 'Randburg', postalCode: '2194' },
          { name: 'Fourways', postalCode: '2055' },
          { name: 'Sunninghill', postalCode: '2157' },
          { name: 'Melrose', postalCode: '2196' },
          { name: 'Parktown', postalCode: '2193' },
          { name: 'Houghton', postalCode: '2198' },
          { name: 'Norwood', postalCode: '2192' },
          { name: 'Bedfordview', postalCode: '2008' },
          { name: 'Edenvale', postalCode: '1609' },
          { name: 'Kempton Park', postalCode: '1619' },
          { name: 'Boksburg', postalCode: '1459' },
          { name: 'Benoni', postalCode: '1501' },
          { name: 'Germiston', postalCode: '1401' },
          { name: 'Alberton', postalCode: '1449' },
          { name: 'Soweto', postalCode: '1868' },
          { name: 'Roodepoort', postalCode: '1724' },
          { name: 'Florida', postalCode: '1709' },
          { name: 'Krugersdorp', postalCode: '1739' },
          { name: 'Muldersdrift', postalCode: '1747' },
          { name: 'Alexandra', postalCode: '2090' },
          { name: 'Midrand', postalCode: '1685' },
          { name: 'Buccleuch', postalCode: '2066' },
          { name: 'Rivonia', postalCode: '2128' },
          { name: 'Craighall', postalCode: '2196' },
          { name: 'Greenside', postalCode: '2193' },
          { name: 'Parkhurst', postalCode: '2193' },
          { name: 'Northcliff', postalCode: '2195' },
          { name: 'Linden', postalCode: '2195' },
          { name: 'Emmarentia', postalCode: '2195' },
          { name: 'Auckland Park', postalCode: '2092' },
          { name: 'Melville', postalCode: '2092' },
          { name: 'Sophiatown', postalCode: '2092' },
          { name: 'Westdene', postalCode: '2092' },
          { name: 'Brixton', postalCode: '2092' },
          { name: 'Newtown', postalCode: '2001' },
          { name: 'Braamfontein', postalCode: '2001' },
          { name: 'Hillbrow', postalCode: '2001' },
          { name: 'Yeoville', postalCode: '2198' },
          { name: 'Berea', postalCode: '2198' },
          { name: 'Observatory', postalCode: '2198' },
          { name: 'Cyrildene', postalCode: '2198' },
          { name: 'Kensington', postalCode: '2094' },
          { name: 'Jeppestown', postalCode: '2094' },
          { name: 'Troyeville', postalCode: '2094' },
        ],
      },
      {
        name: 'Pretoria',
        suburbs: [
          { name: 'Centurion', postalCode: '0157' },
          { name: 'Waterkloof', postalCode: '0181' },
          { name: 'Hatfield', postalCode: '0083' },
          { name: 'Menlyn', postalCode: '0063' },
          { name: 'Brooklyn', postalCode: '0181' },
          { name: 'Lynnwood', postalCode: '0081' },
          { name: 'Garsfontein', postalCode: '0042' },
          { name: 'Faerie Glen', postalCode: '0043' },
          { name: 'Silverlakes', postalCode: '0054' },
          { name: 'Olympus', postalCode: '0081' },
          { name: 'Moreleta Park', postalCode: '0044' },
          { name: 'Newlands', postalCode: '0181' },
          { name: 'Arcadia', postalCode: '0083' },
          { name: 'Sunnyside', postalCode: '0002' },
          { name: 'Muckleneuk', postalCode: '0002' },
          { name: 'Groenkloof', postalCode: '0181' },
          { name: 'Erasmuskloof', postalCode: '0048' },
          { name: 'Queenswood', postalCode: '0186' },
          { name: 'Monument Park', postalCode: '0181' },
          { name: 'Lyttelton', postalCode: '0157' },
          { name: 'Irene', postalCode: '0157' },
          { name: 'Cornwall Hill', postalCode: '0157' },
          { name: 'Midstream', postalCode: '1692' },
          { name: 'Mooikloof', postalCode: '0081' },
          { name: 'Montana', postalCode: '0182' },
          { name: 'Sinoville', postalCode: '0182' },
          { name: 'Wonderboom', postalCode: '0084' },
          { name: 'Annlin', postalCode: '0182' },
          { name: 'Dorandia', postalCode: '0186' },
          { name: 'Parktown Estate', postalCode: '0118' },
          { name: 'The Reeds', postalCode: '0157' },
          { name: 'Highveld', postalCode: '0157' },
        ],
      },
      {
        name: 'Vereeniging',
        suburbs: [
          { name: 'Three Rivers', postalCode: '1929' },
          { name: 'Vanderbijlpark', postalCode: '1911' },
          { name: 'Sasolburg', postalCode: '1947' },
          { name: 'Vaal Marina', postalCode: '1936' },
        ],
      },
    ],
  },
  {
    name: 'Western Cape',
    code: 'WC',
    cities: [
      {
        name: 'Cape Town',
        suburbs: [
          { name: 'City Bowl', postalCode: '8001' },
          { name: 'Sea Point', postalCode: '8005' },
          { name: 'Green Point', postalCode: '8005' },
          { name: 'Mouille Point', postalCode: '8005' },
          { name: 'Camps Bay', postalCode: '8005' },
          { name: 'Clifton', postalCode: '8005' },
          { name: 'Bantry Bay', postalCode: '8005' },
          { name: 'Fresnaye', postalCode: '8005' },
          { name: 'Tamboerskloof', postalCode: '8001' },
          { name: 'Gardens', postalCode: '8001' },
          { name: 'Oranjezicht', postalCode: '8001' },
          { name: 'Higgovale', postalCode: '8001' },
          { name: 'Vredehoek', postalCode: '8001' },
          { name: 'Woodstock', postalCode: '7925' },
          { name: 'Observatory', postalCode: '7925' },
          { name: 'Salt River', postalCode: '7925' },
          { name: 'Mowbray', postalCode: '7700' },
          { name: 'Rosebank', postalCode: '7700' },
          { name: 'Rondebosch', postalCode: '7700' },
          { name: 'Newlands', postalCode: '7700' },
          { name: 'Claremont', postalCode: '7708' },
          { name: 'Kenilworth', postalCode: '7708' },
          { name: 'Wynberg', postalCode: '7800' },
          { name: 'Plumstead', postalCode: '7800' },
          { name: 'Constantia', postalCode: '7806' },
          { name: 'Tokai', postalCode: '7945' },
          { name: 'Bergvliet', postalCode: '7945' },
          { name: 'Diep River', postalCode: '7800' },
          { name: 'Retreat', postalCode: '7945' },
          { name: 'Steenberg', postalCode: '7945' },
          { name: 'Muizenberg', postalCode: '7945' },
          { name: 'Kalk Bay', postalCode: '7975' },
          { name: 'Fish Hoek', postalCode: '7975' },
          { name: 'Simons Town', postalCode: '7995' },
          { name: 'Hout Bay', postalCode: '7806' },
          { name: 'Llandudno', postalCode: '7806' },
          { name: 'Noordhoek', postalCode: '7979' },
          { name: 'Kommetjie', postalCode: '7976' },
          { name: 'Scarborough', postalCode: '7975' },
          { name: 'Century City', postalCode: '7441' },
          { name: 'Milnerton', postalCode: '7441' },
          { name: 'Table View', postalCode: '7441' },
          { name: 'Bloubergstrand', postalCode: '7441' },
          { name: 'Parklands', postalCode: '7441' },
          { name: 'Sunningdale', postalCode: '7441' },
          { name: 'Big Bay', postalCode: '7441' },
          { name: 'Bellville', postalCode: '7530' },
          { name: 'Parow', postalCode: '7500' },
          { name: 'Goodwood', postalCode: '7460' },
          { name: 'Durbanville', postalCode: '7550' },
          { name: 'Brackenfell', postalCode: '7560' },
          { name: 'Kuils River', postalCode: '7579' },
          { name: 'Blue Downs', postalCode: '7100' },
          { name: 'Khayelitsha', postalCode: '7784' },
          { name: 'Mitchells Plain', postalCode: '7785' },
          { name: 'Athlone', postalCode: '7764' },
          { name: 'Lansdowne', postalCode: '7780' },
          { name: 'Crawford', postalCode: '7764' },
        ],
      },
      {
        name: 'Stellenbosch',
        suburbs: [
          { name: 'Central Stellenbosch', postalCode: '7600' },
          { name: 'Die Boord', postalCode: '7613' },
          { name: 'Paradyskloof', postalCode: '7600' },
          { name: 'Dalsig', postalCode: '7600' },
          { name: 'Cloetesville', postalCode: '7600' },
          { name: 'Idas Valley', postalCode: '7609' },
          { name: 'Jamestown', postalCode: '7607' },
          { name: 'Kayamandi', postalCode: '7600' },
          { name: 'Techno Park', postalCode: '7600' },
        ],
      },
      {
        name: 'Paarl',
        suburbs: [
          { name: 'Paarl Central', postalCode: '7646' },
          { name: 'Paarl East', postalCode: '7620' },
          { name: 'Paarl North', postalCode: '7646' },
          { name: 'Charleston Hill', postalCode: '7646' },
          { name: 'Mbekweni', postalCode: '7646' },
          { name: 'Wellington', postalCode: '7654' },
        ],
      },
      {
        name: 'Somerset West',
        suburbs: [
          { name: 'Helderberg', postalCode: '7130' },
          { name: 'Strand', postalCode: '7140' },
          { name: "Gordon's Bay", postalCode: '7150' },
          { name: 'Macassar', postalCode: '7134' },
          { name: 'Lwandle', postalCode: '7141' },
        ],
      },
      {
        name: 'George',
        suburbs: [
          { name: 'Heatherlands', postalCode: '6529' },
          { name: 'Pacaltsdorp', postalCode: '6529' },
          { name: 'Blanco', postalCode: '6529' },
          { name: 'Wilderness', postalCode: '6560' },
        ],
      },
      {
        name: 'Knysna',
        suburbs: [
          { name: 'Knysna Central', postalCode: '6571' },
          { name: 'The Heads', postalCode: '6571' },
          { name: 'Brenton-on-Sea', postalCode: '6572' },
          { name: 'Sedgefield', postalCode: '6573' },
        ],
      },
      {
        name: 'Mossel Bay',
        suburbs: [
          { name: 'Mossel Bay Central', postalCode: '6506' },
          { name: 'Hartenbos', postalCode: '6520' },
          { name: 'Great Brak River', postalCode: '6525' },
        ],
      },
    ],
  },
  {
    name: 'KwaZulu-Natal',
    code: 'KZN',
    cities: [
      {
        name: 'Durban',
        suburbs: [
          { name: 'Durban Central', postalCode: '4001' },
          { name: 'Berea', postalCode: '4001' },
          { name: 'Morningside', postalCode: '4001' },
          { name: 'Musgrave', postalCode: '4001' },
          { name: 'Glenwood', postalCode: '4001' },
          { name: 'Umbilo', postalCode: '4001' },
          { name: 'Essenwood', postalCode: '4001' },
          { name: 'Greyville', postalCode: '4001' },
          { name: 'Windermere', postalCode: '4001' },
          { name: 'Westville', postalCode: '3630' },
          { name: 'Kloof', postalCode: '3610' },
          { name: 'Hillcrest', postalCode: '3650' },
          { name: 'Pinetown', postalCode: '3610' },
          { name: 'Queensburgh', postalCode: '4093' },
          { name: 'Chatsworth', postalCode: '4030' },
          { name: 'Phoenix', postalCode: '4068' },
          { name: 'Verulam', postalCode: '4340' },
          { name: 'Umhlanga', postalCode: '4320' },
          { name: 'Umhlanga Rocks', postalCode: '4320' },
          { name: 'La Lucia', postalCode: '4051' },
          { name: 'Durban North', postalCode: '4051' },
          { name: 'Glenashley', postalCode: '4051' },
          { name: 'Virginia', postalCode: '4051' },
          { name: 'Athlone Park', postalCode: '4037' },
          { name: 'Amanzimtoti', postalCode: '4126' },
          { name: 'Isipingo', postalCode: '4110' },
          { name: 'Umlazi', postalCode: '4031' },
          { name: 'Kwa Mashu', postalCode: '4360' },
          { name: 'Inanda', postalCode: '4310' },
        ],
      },
      {
        name: 'Pietermaritzburg',
        suburbs: [
          { name: 'Pietermaritzburg Central', postalCode: '3201' },
          { name: 'Scottsville', postalCode: '3209' },
          { name: 'Wembley', postalCode: '3201' },
          { name: 'Hayfields', postalCode: '3201' },
          { name: 'Northdale', postalCode: '3201' },
          { name: 'Chase Valley', postalCode: '3201' },
          { name: 'Montrose', postalCode: '3201' },
          { name: 'Athlone', postalCode: '3201' },
        ],
      },
      {
        name: 'Ballito',
        suburbs: [
          { name: 'Ballito Central', postalCode: '4420' },
          { name: 'Simbithi', postalCode: '4420' },
          { name: 'Sheffield Beach', postalCode: '4420' },
          { name: 'Salt Rock', postalCode: '4391' },
        ],
      },
      {
        name: 'Richards Bay',
        suburbs: [
          { name: 'Meerensee', postalCode: '3901' },
          { name: 'Arboretum', postalCode: '3900' },
          { name: 'Birdswood', postalCode: '3900' },
          { name: 'Veld en Vlei', postalCode: '3900' },
        ],
      },
      {
        name: 'Newcastle',
        suburbs: [
          { name: 'Newcastle Central', postalCode: '2940' },
          { name: 'Lennoxton', postalCode: '2940' },
          { name: 'Aviary Hill', postalCode: '2940' },
        ],
      },
    ],
  },
  {
    name: 'Eastern Cape',
    code: 'EC',
    cities: [
      {
        name: 'Gqeberha (Port Elizabeth)',
        suburbs: [
          { name: 'Central', postalCode: '6001' },
          { name: 'Newton Park', postalCode: '6045' },
          { name: 'Summerstrand', postalCode: '6019' },
          { name: 'Humewood', postalCode: '6013' },
          { name: 'Walmer', postalCode: '6070' },
          { name: 'Lorraine', postalCode: '6070' },
          { name: 'Greenacres', postalCode: '6045' },
          { name: 'Sunridge Park', postalCode: '6045' },
          { name: 'Framesby', postalCode: '6045' },
          { name: 'Linkside', postalCode: '6001' },
          { name: 'Mill Park', postalCode: '6001' },
          { name: 'Parsons Hill', postalCode: '6070' },
          { name: 'Kabega Park', postalCode: '6025' },
          { name: 'Bluewater Bay', postalCode: '6210' },
          { name: 'Seaview', postalCode: '6070' },
        ],
      },
      {
        name: 'East London',
        suburbs: [
          { name: 'Beacon Bay', postalCode: '5241' },
          { name: 'Vincent', postalCode: '5217' },
          { name: 'Nahoon', postalCode: '5241' },
          { name: 'Quigney', postalCode: '5201' },
          { name: 'Southernwood', postalCode: '5213' },
          { name: 'Berea', postalCode: '5214' },
          { name: 'Gonubie', postalCode: '5208' },
        ],
      },
      {
        name: 'Mthatha',
        suburbs: [
          { name: 'Mthatha Central', postalCode: '5100' },
          { name: 'Northcrest', postalCode: '5100' },
          { name: 'Southernwood', postalCode: '5100' },
        ],
      },
    ],
  },
  {
    name: 'Limpopo',
    code: 'LP',
    cities: [
      {
        name: 'Polokwane',
        suburbs: [
          { name: 'Polokwane Central', postalCode: '0699' },
          { name: 'Flora Park', postalCode: '0699' },
          { name: 'Bendor', postalCode: '0699' },
          { name: 'Nirvana', postalCode: '0699' },
          { name: 'Westenburg', postalCode: '0699' },
          { name: 'Ivy Park', postalCode: '0699' },
          { name: 'Sterpark', postalCode: '0699' },
        ],
      },
      {
        name: 'Tzaneen',
        suburbs: [
          { name: 'Tzaneen Central', postalCode: '0850' },
          { name: 'Letsitele', postalCode: '0885' },
        ],
      },
    ],
  },
  {
    name: 'Mpumalanga',
    code: 'MP',
    cities: [
      {
        name: 'Nelspruit (Mbombela)',
        suburbs: [
          { name: 'Nelspruit Central', postalCode: '1200' },
          { name: 'West Acres', postalCode: '1201' },
          { name: 'Sonheuwel', postalCode: '1200' },
          { name: 'Riverside Park', postalCode: '1200' },
          { name: 'Steiltes', postalCode: '1201' },
        ],
      },
      {
        name: 'Witbank (eMalahleni)',
        suburbs: [
          { name: 'Witbank Central', postalCode: '1035' },
          { name: 'Ridgeway', postalCode: '1035' },
          { name: 'Klipfontein', postalCode: '1035' },
        ],
      },
    ],
  },
  {
    name: 'North West',
    code: 'NW',
    cities: [
      {
        name: 'Rustenburg',
        suburbs: [
          { name: 'Rustenburg Central', postalCode: '0299' },
          { name: 'Protea Park', postalCode: '0299' },
          { name: 'Waterfall', postalCode: '0299' },
          { name: 'Cashan', postalCode: '0299' },
        ],
      },
      {
        name: 'Potchefstroom',
        suburbs: [
          { name: 'Potchefstroom Central', postalCode: '2520' },
          { name: 'Baillie Park', postalCode: '2520' },
          { name: 'Dassierand', postalCode: '2531' },
        ],
      },
    ],
  },
  {
    name: 'Free State',
    code: 'FS',
    cities: [
      {
        name: 'Bloemfontein',
        suburbs: [
          { name: 'Bloemfontein Central', postalCode: '9301' },
          { name: 'Westdene', postalCode: '9301' },
          { name: 'Willows', postalCode: '9301' },
          { name: 'Langenhoven Park', postalCode: '9330' },
          { name: 'Universitas', postalCode: '9321' },
          { name: 'Bayswater', postalCode: '9301' },
          { name: 'Fichardtpark', postalCode: '9301' },
        ],
      },
      {
        name: 'Welkom',
        suburbs: [
          { name: 'Welkom Central', postalCode: '9459' },
          { name: 'Flamingo Park', postalCode: '9459' },
          { name: 'Dagbreek', postalCode: '9460' },
        ],
      },
    ],
  },
  {
    name: 'Northern Cape',
    code: 'NC',
    cities: [
      {
        name: 'Kimberley',
        suburbs: [
          { name: 'Kimberley Central', postalCode: '8301' },
          { name: 'Beaconsfield', postalCode: '8315' },
          { name: 'Hadison Park', postalCode: '8301' },
          { name: 'Monument Heights', postalCode: '8301' },
        ],
      },
      {
        name: 'Upington',
        suburbs: [
          { name: 'Upington Central', postalCode: '8801' },
          { name: 'Louisvale', postalCode: '8801' },
        ],
      },
    ],
  },
];

/**
 * Get all province names
 */
export const getProvinces = (): string[] => {
  return SOUTH_AFRICAN_LOCATIONS.map(p => p.name);
};

/**
 * Get all cities in a province
 */
export const getCitiesInProvince = (provinceName: string): string[] => {
  const province = SOUTH_AFRICAN_LOCATIONS.find(p => p.name === provinceName);
  return province ? province.cities.map(c => c.name) : [];
};

/**
 * Get all suburbs in a city
 */
export const getSuburbsInCity = (provinceName: string, cityName: string): Suburb[] => {
  const province = SOUTH_AFRICAN_LOCATIONS.find(p => p.name === provinceName);
  if (!province) return [];

  const city = province.cities.find(c => c.name === cityName);
  return city ? city.suburbs : [];
};

/**
 * Search locations by query
 */
export const searchLocations = (
  query: string
): {
  provinces: string[];
  cities: { name: string; province: string }[];
  suburbs: { name: string; city: string; province: string; postalCode?: string }[];
} => {
  const lowerQuery = query.toLowerCase();
  const results = {
    provinces: [] as string[],
    cities: [] as { name: string; province: string }[],
    suburbs: [] as { name: string; city: string; province: string; postalCode?: string }[],
  };

  SOUTH_AFRICAN_LOCATIONS.forEach(province => {
    if (province.name.toLowerCase().includes(lowerQuery)) {
      results.provinces.push(province.name);
    }

    province.cities.forEach(city => {
      if (city.name.toLowerCase().includes(lowerQuery)) {
        results.cities.push({ name: city.name, province: province.name });
      }

      city.suburbs.forEach(suburb => {
        if (suburb.name.toLowerCase().includes(lowerQuery)) {
          results.suburbs.push({
            name: suburb.name,
            city: city.name,
            province: province.name,
            postalCode: suburb.postalCode,
          });
        }
      });
    });
  });

  return results;
};

/**
 * Backward compatibility: flat list of cities
 * Alphabetically sorted comprehensive list of all South African cities and towns
 */
export const SOUTH_AFRICAN_CITIES = [
  'Aberdeen',
  'Aliwal North',
  'Ballito',
  'Beaufort West',
  'Benoni',
  'Bethlehem',
  'Bhisho',
  'Bloemfontein',
  'Boksburg',
  'Bredasdorp',
  'Brits',
  'Butterworth',
  'Cape Town',
  'Carltonville',
  'Ceres',
  'Centurion',
  'Clanwilliam',
  'Cradock',
  'De Aar',
  'Durban',
  'East London',
  'Ekurhuleni',
  'Emalahleni (Witbank)',
  'Ermelo',
  'George',
  'Giyani',
  'Graaf-Reinet',
  'Grahamstown (Makhanda)',
  'Graaff-Reinet',
  'Greytown',
  'Harrismith',
  'Hermanus',
  'Hoedspruit',
  'Johannesburg',
  'Kimberley',
  'King Williams Town',
  'Klerksdorp',
  'Knysna',
  'Kokstad',
  'Kroonstad',
  'Krugersdorp',
  'Kuruman',
  'Ladysmith',
  'Lephalale',
  'Lichtenburg',
  'Louis Trichardt (Makhado)',
  'Lydenburg',
  'Mahikeng',
  'Margate',
  'Mbombela (Nelspruit)',
  'Middelburg',
  'Midrand',
  'Mmabatho',
  'Modimolle',
  'Mokopane',
  'Mossel Bay',
  'Mthatha',
  'Musina',
  'Newcastle',
  'Oudtshoorn',
  'Paarl',
  'Parys',
  'Phalaborwa',
  'Pietermaritzburg',
  'Pietersburg (Polokwane)',
  'Plettenberg Bay',
  'Polokwane',
  'Port Alfred',
  'Port Elizabeth (Gqeberha)',
  'Port Shepstone',
  'Potchefstroom',
  'Pretoria',
  'Queenstown',
  'Randburg',
  'Richards Bay',
  'Roodepoort',
  'Rustenburg',
  'Sasolburg',
  'Secunda',
  'Sedibeng',
  'Somerset East',
  'Somerset West',
  'Springbok',
  'Springs',
  'Standerton',
  'Stellenbosch',
  'Stilfontein',
  'Swellendam',
  'Thohoyandou',
  'Tzaneen',
  'Uitenhage',
  'Ulundi',
  'Upington',
  'Vanderbijlpark',
  'Vereeniging',
  'Virginia',
  'Vredendal',
  'Vredenburg',
  'Vryburg',
  'Vryheid',
  'Welkom',
  'Wellington',
  'Worcester',
].sort();

/**
 * Get all cities and suburbs combined for filtering
 * Returns an alphabetically sorted list of all unique city and suburb names
 */
export const getAllCitiesAndSuburbs = (): string[] => {
  const locations = new Set<string>();

  // Add all cities
  SOUTH_AFRICAN_CITIES.forEach(city => locations.add(city));

  // Add all suburbs from the detailed location hierarchy
  SOUTH_AFRICAN_LOCATIONS.forEach(province => {
    province.cities.forEach(city => {
      city.suburbs.forEach(suburb => {
        locations.add(suburb.name);
      });
    });
  });

  // Convert to array and sort alphabetically
  return Array.from(locations).sort();
};
