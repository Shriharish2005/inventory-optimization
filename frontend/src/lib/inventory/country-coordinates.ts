// Auto-generated country geographic coordinates & metadata lookup table
export interface CountryGeoMeta {
  lat: number;
  lng: number;
  x: number; // SVG X coordinate (0-1000)
  y: number; // SVG Y coordinate (0-500)
  flag: string;
  region: string;
  hub: string;
}

export interface LogisticsHub {
  name: string;
  lat: number;
  lng: number;
  code: string;
}

export const LOGISTICS_HUBS: Record<string, LogisticsHub> = {
  "NYC Logistics Hub": {
    "name": "NYC North America Hub",
    "lat": 40.7128,
    "lng": -74.006,
    "code": "JFK-HUB"
  },
  "Frankfurt Logistics Hub": {
    "name": "Frankfurt European Central Hub",
    "lat": 50.1109,
    "lng": 8.6821,
    "code": "FRA-HUB"
  },
  "Shanghai Sea Port Hub": {
    "name": "Shanghai Asia-Pacific Hub",
    "lat": 31.2304,
    "lng": 121.4737,
    "code": "PVG-HUB"
  },
  "Singapore Transit Hub": {
    "name": "Singapore Maritime Hub",
    "lat": 1.3521,
    "lng": 103.8198,
    "code": "SIN-HUB"
  },
  "Dubai Freight Hub": {
    "name": "Dubai MENA Transit Hub",
    "lat": 25.2048,
    "lng": 55.2708,
    "code": "DXB-HUB"
  },
  "Sao Paulo Air Hub": {
    "name": "Sao Paulo LATAM Hub",
    "lat": -23.5505,
    "lng": -46.6333,
    "code": "GRU-HUB"
  },
  "Sydney Gateway Hub": {
    "name": "Sydney Oceania Gateway",
    "lat": -33.8688,
    "lng": 151.2093,
    "code": "SYD-HUB"
  }
};

export const COUNTRY_GEO_META: Record<string, CountryGeoMeta> = {
  "United States": { lat: 37.0902, lng: -95.7129, x: 234.13, y: 146.97, flag: "🇺🇸", region: "North America", hub: "NYC Logistics Hub" },
  "Australia": { lat: -25.2744, lng: 133.7751, x: 871.6, y: 320.21, flag: "🇦🇺", region: "Asia Pacific", hub: "Sydney Gateway Hub" },
  "France": { lat: 46.2276, lng: 2.2137, x: 506.15, y: 121.59, flag: "🇫🇷", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "China": { lat: 35.8617, lng: 104.1954, x: 789.43, y: 150.38, flag: "🇨🇳", region: "Asia Pacific", hub: "Shanghai Sea Port Hub" },
  "Germany": { lat: 51.1657, lng: 10.4515, x: 529.03, y: 107.87, flag: "🇩🇪", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Mexico": { lat: 23.6345, lng: -102.5528, x: 215.13, y: 184.35, flag: "🇲🇽", region: "North America", hub: "NYC Logistics Hub" },
  "India": { lat: 20.5937, lng: 78.9629, x: 719.34, y: 192.8, flag: "🇮🇳", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "United Kingdom": { lat: 55.3781, lng: -3.436, x: 490.46, y: 96.17, flag: "🇬🇧", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Indonesia": { lat: -0.7893, lng: 113.9213, x: 816.45, y: 252.19, flag: "🇮🇩", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "Brazil": { lat: -14.235, lng: -51.9253, x: 355.76, y: 289.54, flag: "🇧🇷", region: "Latin America", hub: "Sao Paulo Air Hub" },
  "Italy": { lat: 41.8719, lng: 12.5674, x: 534.91, y: 133.69, flag: "🇮🇹", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Spain": { lat: 40.4637, lng: -3.7492, x: 489.59, y: 137.6, flag: "🇪🇸", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Philippines": { lat: 12.8797, lng: 121.774, x: 838.26, y: 214.22, flag: "🇵🇭", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "El Salvador": { lat: 13.7942, lng: -88.8965, x: 253.07, y: 211.68, flag: "🇸🇻", region: "Latin America", hub: "NYC Logistics Hub" },
  "New Zealand": { lat: -40.9006, lng: 174.886, x: 985.79, y: 363.61, flag: "🇳🇿", region: "Asia Pacific", hub: "Sydney Gateway Hub" },
  "Cuba": { lat: 21.5218, lng: -77.7812, x: 283.94, y: 190.22, flag: "🇨🇺", region: "Latin America", hub: "NYC Logistics Hub" },
  "Nicaragua": { lat: 12.8654, lng: -85.2072, x: 263.31, y: 214.26, flag: "🇳🇮", region: "Latin America", hub: "NYC Logistics Hub" },
  "Guatemala": { lat: 15.7835, lng: -90.2308, x: 249.36, y: 206.16, flag: "🇬🇹", region: "Latin America", hub: "NYC Logistics Hub" },
  "Dominican Republic": { lat: 18.7357, lng: -70.1627, x: 305.1, y: 197.96, flag: "🇩🇴", region: "Latin America", hub: "NYC Logistics Hub" },
  "Iran": { lat: 32.4279, lng: 53.688, x: 649.13, y: 159.92, flag: "🇮🇷", region: "Middle East", hub: "Dubai Freight Hub" },
  "Turkey": { lat: 38.9637, lng: 35.2433, x: 597.9, y: 141.77, flag: "🇹🇷", region: "Middle East", hub: "Frankfurt Logistics Hub" },
  "Japan": { lat: 36.2048, lng: 138.2529, x: 884.04, y: 149.43, flag: "🇯🇵", region: "Asia Pacific", hub: "Shanghai Sea Port Hub" },
  "South Africa": { lat: -30.5595, lng: 22.9375, x: 563.72, y: 334.89, flag: "🇿🇦", region: "Africa", hub: "Dubai Freight Hub" },
  "Austria": { lat: 47.5162, lng: 14.5501, x: 540.42, y: 118.01, flag: "🇦🇹", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Honduras": { lat: 15.2, lng: -86.2419, x: 260.44, y: 207.78, flag: "🇭🇳", region: "Latin America", hub: "NYC Logistics Hub" },
  "Democratic Republic of the Congo": { lat: -4.0383, lng: 21.7587, x: 560.44, y: 261.22, flag: "🇨🇩", region: "Africa", hub: "Dubai Freight Hub" },
  "Morocco": { lat: 31.7917, lng: -7.0926, x: 480.3, y: 161.69, flag: "🇲🇦", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Ukraine": { lat: 48.3794, lng: 31.1656, x: 586.57, y: 115.61, flag: "🇺🇦", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Egypt": { lat: 26.8206, lng: 30.8025, x: 585.56, y: 175.5, flag: "🇪🇬", region: "Middle East", hub: "Dubai Freight Hub" },
  "Russia": { lat: 61.524, lng: 105.3188, x: 792.55, y: 79.1, flag: "🇷🇺", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Saudi Arabia": { lat: 23.8859, lng: 45.0792, x: 625.22, y: 183.65, flag: "🇸🇦", region: "Middle East", hub: "Dubai Freight Hub" },
  "Colombia": { lat: 4.5709, lng: -74.2973, x: 293.62, y: 237.3, flag: "🇨🇴", region: "Latin America", hub: "Sao Paulo Air Hub" },
  "Bangladesh": { lat: 23.685, lng: 90.3563, x: 750.99, y: 184.21, flag: "🇧🇩", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "Netherlands": { lat: 52.1326, lng: 5.2913, x: 514.7, y: 105.19, flag: "🇳🇱", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Thailand": { lat: 15.87, lng: 100.9925, x: 780.53, y: 205.92, flag: "🇹🇭", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "Iraq": { lat: 33.2232, lng: 43.6793, x: 621.33, y: 157.71, flag: "🇮🇶", region: "Middle East", hub: "Dubai Freight Hub" },
  "Canada": { lat: 56.1304, lng: -106.3468, x: 204.59, y: 94.08, flag: "🇨🇦", region: "North America", hub: "NYC Logistics Hub" },
  "Vietnam": { lat: 14.0583, lng: 108.2772, x: 800.77, y: 210.95, flag: "🇻🇳", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "Malaysia": { lat: 4.2105, lng: 101.9758, x: 783.27, y: 238.3, flag: "🇲🇾", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "Pakistan": { lat: 30.3753, lng: 69.3451, x: 692.63, y: 165.62, flag: "🇵🇰", region: "Asia Pacific", hub: "Dubai Freight Hub" },
  "Argentina": { lat: -38.4161, lng: -63.6167, x: 323.29, y: 356.71, flag: "🇦🇷", region: "Latin America", hub: "Sao Paulo Air Hub" },
  "Nigeria": { lat: 9.082, lng: 8.6753, x: 524.1, y: 224.77, flag: "🇳🇬", region: "Africa", hub: "Dubai Freight Hub" },
  "Panama": { lat: 8.538, lng: -80.7821, x: 275.61, y: 226.28, flag: "🇵🇦", region: "Latin America", hub: "NYC Logistics Hub" },
  "Belgium": { lat: 50.5039, lng: 4.4699, x: 512.42, y: 109.71, flag: "🇧🇪", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Poland": { lat: 51.9194, lng: 19.1451, x: 553.18, y: 105.78, flag: "🇵🇱", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Singapore": { lat: 1.3521, lng: 103.8198, x: 788.39, y: 246.24, flag: "🇸🇬", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "Romania": { lat: 45.9432, lng: 24.9668, x: 569.35, y: 122.38, flag: "🇷🇴", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Algeria": { lat: 28.0339, lng: 1.6596, x: 504.61, y: 172.13, flag: "🇩🇿", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Chile": { lat: -35.6751, lng: -71.543, x: 301.27, y: 349.1, flag: "🇨🇱", region: "Latin America", hub: "Sao Paulo Air Hub" },
  "Myanmar (Burma)": { lat: 21.9162, lng: 95.956, x: 766.54, y: 189.12, flag: "🇲🇲", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "South Korea": { lat: 35.9078, lng: 127.7669, x: 854.91, y: 150.26, flag: "🇰🇷", region: "Asia Pacific", hub: "Shanghai Sea Port Hub" },
  "Sweden": { lat: 60.1282, lng: 18.6435, x: 551.79, y: 82.98, flag: "🇸🇪", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Senegal": { lat: 14.4974, lng: -14.4524, x: 459.85, y: 209.73, flag: "🇸🇳", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Tanzania": { lat: -6.369, lng: 34.8888, x: 596.91, y: 267.69, flag: "🇹🇿", region: "Africa", hub: "Dubai Freight Hub" },
  "Venezuela": { lat: 6.4238, lng: -66.5897, x: 315.03, y: 232.16, flag: "🇻🇪", region: "Latin America", hub: "Sao Paulo Air Hub" },
  "Zambia": { lat: -13.1339, lng: 27.8493, x: 577.36, y: 286.48, flag: "🇿🇲", region: "Africa", hub: "Dubai Freight Hub" },
  "Cote d'Ivoire": { lat: 7.54, lng: -5.5471, x: 484.59, y: 229.06, flag: "🇨🇮", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Angola": { lat: -11.2027, lng: 17.8739, x: 549.65, y: 281.12, flag: "🇦🇴", region: "Africa", hub: "Dubai Freight Hub" },
  "Switzerland": { lat: 46.8182, lng: 8.2275, x: 522.85, y: 119.95, flag: "🇨🇭", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Ghana": { lat: 7.9465, lng: -1.0232, x: 497.16, y: 227.93, flag: "🇬🇭", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Cameroon": { lat: 7.3697, lng: 12.3547, x: 534.32, y: 229.53, flag: "🇨🇲", region: "Africa", hub: "Dubai Freight Hub" },
  "Afghanistan": { lat: 33.9391, lng: 67.71, x: 688.08, y: 155.72, flag: "🇦🇫", region: "Asia Pacific", hub: "Dubai Freight Hub" },
  "Mozambique": { lat: -18.6657, lng: 35.5296, x: 598.69, y: 301.85, flag: "🇲🇿", region: "Africa", hub: "Dubai Freight Hub" },
  "Finland": { lat: 61.9241, lng: 25.7482, x: 571.52, y: 77.99, flag: "🇫🇮", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Norway": { lat: 60.472, lng: 8.4689, x: 523.52, y: 82.02, flag: "🇳🇴", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Israel": { lat: 31.0461, lng: 34.8516, x: 596.81, y: 163.76, flag: "🇮🇱", region: "Middle East", hub: "Dubai Freight Hub" },
  "Peru": { lat: -9.19, lng: -75.0152, x: 291.62, y: 275.53, flag: "🇵🇪", region: "Latin America", hub: "Sao Paulo Air Hub" },
  "Kenya": { lat: -0.0236, lng: 37.9062, x: 605.3, y: 250.07, flag: "🇰🇪", region: "Africa", hub: "Dubai Freight Hub" },
  "Cambodia": { lat: 12.5657, lng: 104.991, x: 791.64, y: 215.1, flag: "🇰🇭", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "Ireland": { lat: 53.1424, lng: -7.6921, x: 478.63, y: 102.38, flag: "🇮🇪", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Sudan": { lat: 12.8628, lng: 30.2176, x: 583.94, y: 214.27, flag: "🇸🇩", region: "Africa", hub: "Dubai Freight Hub" },
  "Bulgaria": { lat: 42.7339, lng: 25.4858, x: 570.79, y: 131.29, flag: "🇧🇬", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Portugal": { lat: 39.3999, lng: -8.2245, x: 477.15, y: 140.56, flag: "🇵🇹", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Hungary": { lat: 47.1625, lng: 19.5033, x: 554.18, y: 118.99, flag: "🇭🇺", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Belarus": { lat: 53.7098, lng: 27.9534, x: 577.65, y: 100.81, flag: "🇧🇾", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Ecuador": { lat: -1.8312, lng: -78.1834, x: 282.82, y: 255.09, flag: "🇪🇨", region: "Latin America", hub: "Sao Paulo Air Hub" },
  "Madagascar": { lat: -18.7669, lng: 46.8691, x: 630.19, y: 302.13, flag: "🇲🇬", region: "Africa", hub: "Dubai Freight Hub" },
  "Bolivia": { lat: -16.2902, lng: -63.5887, x: 323.36, y: 295.25, flag: "🇧🇴", region: "Latin America", hub: "Sao Paulo Air Hub" },
  "Haiti": { lat: 18.9712, lng: -72.2852, x: 299.21, y: 197.3, flag: "🇭🇹", region: "Latin America", hub: "NYC Logistics Hub" },
  "Uruguay": { lat: -32.5228, lng: -55.7658, x: 345.1, y: 340.34, flag: "🇺🇾", region: "Latin America", hub: "Sao Paulo Air Hub" },
  "Czech Republic": { lat: 49.8175, lng: 15.473, x: 542.98, y: 111.62, flag: "🇨🇿", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Mali": { lat: 17.5707, lng: -3.9962, x: 488.9, y: 201.19, flag: "🇲🇱", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Denmark": { lat: 56.2639, lng: 9.5018, x: 526.39, y: 93.71, flag: "🇩🇰", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Somalia": { lat: 5.1521, lng: 46.1996, x: 628.33, y: 235.69, flag: "🇸🇴", region: "Africa", hub: "Dubai Freight Hub" },
  "Libya": { lat: 26.3351, lng: 17.2283, x: 547.86, y: 176.85, flag: "🇱🇾", region: "Africa", hub: "Dubai Freight Hub" },
  "Taiwan": { lat: 23.6978, lng: 120.9605, x: 836, y: 184.17, flag: "🇹🇼", region: "Asia Pacific", hub: "Shanghai Sea Port Hub" },
  "Uzbekistan": { lat: 41.3775, lng: 64.5853, x: 679.4, y: 135.06, flag: "🇺🇿", region: "Asia Pacific", hub: "Dubai Freight Hub" },
  "Jordan": { lat: 30.5852, lng: 36.2384, x: 600.66, y: 165.04, flag: "🇯🇴", region: "Middle East", hub: "Dubai Freight Hub" },
  "Barbados": { lat: 13.1939, lng: -59.5432, x: 334.6, y: 213.35, flag: "🇧🇧", region: "Latin America", hub: "NYC Logistics Hub" },
  "Niger": { lat: 17.6078, lng: 8.0817, x: 522.45, y: 201.09, flag: "🇳🇪", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Trinidad and Tobago": { lat: 10.6918, lng: -61.2225, x: 329.94, y: 220.3, flag: "🇹🇹", region: "Latin America", hub: "NYC Logistics Hub" },
  "Mongolia": { lat: 46.8625, lng: 103.8467, x: 788.46, y: 119.83, flag: "🇲🇳", region: "Asia Pacific", hub: "Shanghai Sea Port Hub" },
  "Jamaica": { lat: 18.1096, lng: -77.2975, x: 285.28, y: 199.7, flag: "🇯🇲", region: "Latin America", hub: "NYC Logistics Hub" },
  "Lithuania": { lat: 55.1694, lng: 23.8813, x: 566.34, y: 96.75, flag: "🇱🇹", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Lesotho": { lat: -29.61, lng: 28.2336, x: 578.43, y: 332.25, flag: "🇱🇸", region: "Africa", hub: "Dubai Freight Hub" },
  "Benin": { lat: 9.3077, lng: 2.3158, x: 506.43, y: 224.15, flag: "🇧🇯", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Hong Kong": { lat: 22.3193, lng: 114.1694, x: 817.14, y: 188, flag: "🇭🇰", region: "Asia Pacific", hub: "Shanghai Sea Port Hub" },
  "Qatar": { lat: 25.3548, lng: 51.1839, x: 642.18, y: 179.57, flag: "🇶🇦", region: "Middle East", hub: "Dubai Freight Hub" },
  "Martinique": { lat: 14.6415, lng: -61.0242, x: 330.49, y: 209.33, flag: "🇲🇶", region: "Latin America", hub: "NYC Logistics Hub" },
  "Azerbaijan": { lat: 40.1431, lng: 47.5769, x: 632.16, y: 138.49, flag: "🇦🇿", region: "Asia Pacific", hub: "Dubai Freight Hub" },
  "Georgia": { lat: 42.3154, lng: 43.3569, x: 620.44, y: 132.46, flag: "🇬🇪", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Syria": { lat: 34.8021, lng: 38.9968, x: 608.32, y: 153.33, flag: "🇸🇾", region: "Middle East", hub: "Dubai Freight Hub" },
  "Rwanda": { lat: -1.9403, lng: 29.8739, x: 582.98, y: 255.39, flag: "🇷🇼", region: "Africa", hub: "Dubai Freight Hub" },
  "Moldova": { lat: 47.4116, lng: 28.3699, x: 578.81, y: 118.3, flag: "🇲🇩", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Kyrgyzstan": { lat: 41.2044, lng: 74.7661, x: 707.68, y: 135.54, flag: "🇰🇬", region: "Asia Pacific", hub: "Dubai Freight Hub" },
  "Kazakhstan": { lat: 48.0196, lng: 66.9237, x: 685.9, y: 116.61, flag: "🇰🇿", region: "Asia Pacific", hub: "Dubai Freight Hub" },
  "Estonia": { lat: 58.5953, lng: 25.0136, x: 569.48, y: 87.24, flag: "🇪🇪", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Croatia": { lat: 45.1, lng: 15.2, x: 542.22, y: 124.72, flag: "🇭🇷", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Togo": { lat: 8.6195, lng: 0.8248, x: 502.29, y: 226.06, flag: "🇹🇬", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Mauritania": { lat: 21.0079, lng: -10.9408, x: 469.61, y: 191.64, flag: "🇲🇷", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Montenegro": { lat: 42.7087, lng: 19.3744, x: 553.82, y: 131.36, flag: "🇲🇪", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Albania": { lat: 41.1533, lng: 20.1683, x: 556.02, y: 135.69, flag: "🇦🇱", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Zimbabwe": { lat: -19.0154, lng: 29.1549, x: 580.99, y: 302.82, flag: "🇿🇼", region: "Africa", hub: "Dubai Freight Hub" },
  "Liberia": { lat: 6.4281, lng: -9.4295, x: 473.81, y: 232.14, flag: "🇱🇷", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Nepal": { lat: 28.3949, lng: 84.124, x: 733.68, y: 171.13, flag: "🇳🇵", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "Guinea": { lat: 9.9456, lng: -9.6966, x: 473.07, y: 222.37, flag: "🇬🇳", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Papua New Guinea": { lat: -6.314993, lng: 143.95555, x: 899.88, y: 267.54, flag: "🇵🇬", region: "Asia Pacific", hub: "Sydney Gateway Hub" },
  "Namibia": { lat: -22.9576, lng: 18.4904, x: 551.36, y: 313.77, flag: "🇳🇦", region: "Africa", hub: "Dubai Freight Hub" },
  "Lebanon": { lat: 33.8547, lng: 35.8623, x: 599.62, y: 155.96, flag: "🇱🇧", region: "Middle East", hub: "Dubai Freight Hub" },
  "Republic of the Congo": { lat: -0.228, lng: 15.8277, x: 543.97, y: 250.63, flag: "🇨🇬", region: "Africa", hub: "Dubai Freight Hub" },
  "Bosnia and Herzegovina": { lat: 43.9159, lng: 17.6791, x: 549.11, y: 128.01, flag: "🇧🇦", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Paraguay": { lat: -23.4425, lng: -58.4438, x: 337.66, y: 315.12, flag: "🇵🇾", region: "Latin America", hub: "Sao Paulo Air Hub" },
  "Yemen": { lat: 15.5527, lng: 48.5164, x: 634.77, y: 206.8, flag: "🇾🇪", region: "Middle East", hub: "Dubai Freight Hub" },
  "Sierra Leone": { lat: 8.4606, lng: -11.7799, x: 467.28, y: 226.5, flag: "🇸🇱", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Djibouti": { lat: 11.8251, lng: 42.5903, x: 618.31, y: 217.15, flag: "🇩🇯", region: "Africa", hub: "Dubai Freight Hub" },
  "Central African Republic": { lat: 6.6111, lng: 20.9394, x: 558.17, y: 231.64, flag: "🇨🇫", region: "Africa", hub: "Dubai Freight Hub" },
  "Guinea-Bissau": { lat: 11.8037, lng: -15.1804, x: 457.83, y: 217.21, flag: "🇬🇼", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Turkmenistan": { lat: 38.9697, lng: 59.5563, x: 665.43, y: 141.75, flag: "🇹🇲", region: "Asia Pacific", hub: "Dubai Freight Hub" },
  "Tunisia": { lat: 33.8869, lng: 9.5375, x: 526.49, y: 155.87, flag: "🇹🇳", region: "Africa", hub: "Frankfurt Logistics Hub" },
  "Gabon": { lat: -0.8037, lng: 11.6094, x: 532.25, y: 252.23, flag: "🇬🇦", region: "Africa", hub: "Dubai Freight Hub" },
  "Uganda": { lat: 1.3733, lng: 32.2903, x: 589.7, y: 246.19, flag: "🇺🇬", region: "Africa", hub: "Dubai Freight Hub" },
  "Slovenia": { lat: 46.1512, lng: 14.9955, x: 541.65, y: 121.8, flag: "🇸🇮", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Guadeloupe": { lat: 16.265, lng: -61.551, x: 329.03, y: 204.82, flag: "🇬🇵", region: "Latin America", hub: "NYC Logistics Hub" },
  "Chad": { lat: 15.4542, lng: 18.7322, x: 552.03, y: 207.07, flag: "🇹🇩", region: "Africa", hub: "Dubai Freight Hub" },
  "South Sudan": { lat: 6.877, lng: 31.307, x: 586.96, y: 230.9, flag: "🇸🇸", region: "Africa", hub: "Dubai Freight Hub" },
  "Slovakia": { lat: 48.669, lng: 19.699, x: 554.72, y: 114.81, flag: "🇸🇰", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Sri Lanka": { lat: 7.8731, lng: 80.7718, x: 724.37, y: 228.13, flag: "🇱🇰", region: "Asia Pacific", hub: "Singapore Transit Hub" },
  "Ethiopia": { lat: 9.145, lng: 40.4897, x: 612.47, y: 224.6, flag: "🇪🇹", region: "Africa", hub: "Dubai Freight Hub" },
  "United Arab Emirates": { lat: 23.4241, lng: 53.8478, x: 649.58, y: 184.93, flag: "🇦🇪", region: "Middle East", hub: "Dubai Freight Hub" },
  "Bahrain": { lat: 26.0667, lng: 50.5577, x: 640.44, y: 177.59, flag: "🇧🇭", region: "Middle East", hub: "Dubai Freight Hub" },
  "Swaziland": { lat: -26.5225, lng: 31.4659, x: 587.41, y: 323.67, flag: "🇸🇿", region: "Africa", hub: "Dubai Freight Hub" },
  "Burundi": { lat: -3.3731, lng: 29.9189, x: 583.11, y: 259.37, flag: "🇧🇮", region: "Africa", hub: "Dubai Freight Hub" },
  "Tajikistan": { lat: 38.861, lng: 71.2761, x: 697.99, y: 142.05, flag: "🇹🇯", region: "Asia Pacific", hub: "Dubai Freight Hub" },
  "Macedonia": { lat: 41.6086, lng: 21.7453, x: 560.4, y: 134.42, flag: "🇲🇰", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Eritrea": { lat: 15.1794, lng: 39.7823, x: 610.51, y: 207.83, flag: "🇪🇷", region: "Africa", hub: "Dubai Freight Hub" },
  "Armenia": { lat: 40.0691, lng: 45.0382, x: 625.11, y: 138.7, flag: "🇦🇲", region: "Europe", hub: "Frankfurt Logistics Hub" },
  "Equatorial Guinea": { lat: 1.6508, lng: 10.2679, x: 528.52, y: 245.41, flag: "🇬🇶", region: "Africa", hub: "Dubai Freight Hub" },
};

export function getCountryMeta(countryName: string): CountryGeoMeta {
  return COUNTRY_GEO_META[countryName] || {
    lat: 20,
    lng: 0,
    x: 500,
    y: 250,
    flag: "🌐",
    region: "International",
    hub: "Frankfurt Logistics Hub"
  };
}
