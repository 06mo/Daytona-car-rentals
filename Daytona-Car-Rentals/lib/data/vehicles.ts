export type VehicleCategory = "economy" | "suv" | "luxury" | "van" | "truck" | "convertible";

export interface TuroVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  color: string;
  category: VehicleCategory;
  seats: number;
  transmission: "Automatic" | "Manual";
  mileage: string;
  features: string[];
  image: string;
  turoUrl: string;
  description: string;
  featured?: boolean;
}

export const TURO_HOST_URL = "https://turo.com/host/15068965";

// Wikimedia Commons press/reference photos — placeholders until real car photos are added.
// Each URL is the specific make/model from commons.wikimedia.org (CC-licensed).
// Replace with your own photos by dropping images in /public/images/ and updating these paths.

export const vehicles: TuroVehicle[] = [
  {
    id: "corolla-2943051",
    year: 2024,
    make: "Toyota",
    model: "Corolla",
    color: "Blue",
    category: "economy",
    seats: 5,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "Apple CarPlay", "Android Auto", "USB-C", "Keyless Entry"],
    // 2021 Toyota Corolla LE sedan — same E210 generation as 2024
    image: "https://upload.wikimedia.org/wikipedia/commons/b/b3/2021_Toyota_Corolla_LE,_front_right,_07-13-2024.jpg",
    turoUrl: "https://turo.com/us/en/car-rental/united-states/daytona-beach-fl/toyota/corolla/2943051",
    description: "A reliable, fuel-efficient 2024 Corolla in eye-catching blue. Great for beach weekends, airport runs, and everything in between.",
    featured: true,
  },
  {
    id: "silverado-2942499",
    year: 2024,
    make: "Chevrolet",
    model: "Silverado 1500",
    color: "Black",
    category: "truck",
    seats: 5,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "Apple CarPlay", "Android Auto", "Truck Bed", "Towing Capacity", "4WD"],
    // 2023 Chevrolet Silverado LT — identical body to 2024
    image: "https://upload.wikimedia.org/wikipedia/commons/b/bf/2023_Chevrolet_Silverado_LT_front_view.jpg",
    turoUrl: "https://turo.com/us/en/truck-rental/united-states/daytona-beach-fl/chevrolet/silverado-1500/2942499",
    description: "A powerful 2024 Silverado in sleek black. Perfect for hauling gear, towing, or cruising Daytona in style.",
    featured: true,
  },
  {
    id: "carnival-2943029",
    year: 2024,
    make: "Kia",
    model: "Carnival",
    color: "Black",
    category: "van",
    seats: 8,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "Apple CarPlay", "Android Auto", "Sliding Doors", "Third Row Seating", "USB Ports Throughout"],
    // 2020 Kia Carnival KA4 — same generation as 2024
    image: "https://upload.wikimedia.org/wikipedia/commons/2/2a/20201013_Kia_Carnival_Front_Side.jpg",
    turoUrl: "https://turo.com/us/en/minivan-rental/united-states/daytona-beach-fl/kia/carnival/2943029",
    description: "A spacious 2024 Kia Carnival in black. Fits the whole crew comfortably — ideal for family trips, group travel, or event weekends.",
    featured: true,
  },
  {
    id: "corolla-2943048",
    year: 2024,
    make: "Toyota",
    model: "Corolla",
    color: "Silver",
    category: "economy",
    seats: 5,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "Apple CarPlay", "Android Auto", "USB-C", "Keyless Entry"],
    // 2020 Toyota Corolla SE in Classic Silver Metallic — same E210 generation
    image: "https://upload.wikimedia.org/wikipedia/commons/3/38/2020_Toyota_Corolla_SE_Upgrade_Package_Sedan_in_Classic_Silver_Metallic,_front_left,_2025-04-20.jpg",
    turoUrl: "https://turo.com/us/en/car-rental/united-states/daytona-beach-fl/toyota/corolla/2943048",
    description: "A clean, efficient 2024 Corolla in silver. Simple, dependable, and ready for your Daytona Beach adventure.",
  },
  {
    id: "carnival-2946592",
    year: 2024,
    make: "Kia",
    model: "Carnival",
    color: "Blue",
    category: "van",
    seats: 8,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "Apple CarPlay", "Android Auto", "Sliding Doors", "Third Row Seating", "USB Ports Throughout"],
    // Kia Carnival KA4 Hybrid in Snow White Pearl — same generation as 2024
    image: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Kia_Carnival_Hybrid_KA4_PE_HEV_Snow_White_Pearl_(5).jpg",
    turoUrl: "https://turo.com/us/en/minivan-rental/united-states/daytona-beach-fl/kia/carnival/2946592",
    description: "A 2024 Kia Carnival in blue — the ultimate people mover. Seats 8 in comfort with room for luggage.",
  },
  {
    id: "camry-2982907",
    year: 2024,
    make: "Toyota",
    model: "Camry",
    color: "Blue",
    category: "economy",
    seats: 5,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "Apple CarPlay", "Android Auto", "Adaptive Cruise Control", "Lane Assist"],
    // Toyota Camry XV80 — 2024 generation
    image: "https://upload.wikimedia.org/wikipedia/commons/5/54/TOYOTA_CAMRY_(XV80)_China.jpg",
    turoUrl: "https://turo.com/us/en/car-rental/united-states/daytona-beach-fl/toyota/camry/2982907",
    description: "A stylish 2024 Camry in blue with a smooth ride and modern safety features. Great for longer trips up and down the Florida coast.",
  },
  {
    id: "santafe-3143340",
    year: 2018,
    make: "Hyundai",
    model: "Santa Fe Sport",
    color: "Black",
    category: "suv",
    seats: 5,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "Apple CarPlay", "AWD", "Panoramic Sunroof", "Heated Seats"],
    // 2018 Hyundai Santa Fe (NC/DM generation)
    image: "https://upload.wikimedia.org/wikipedia/commons/d/d2/2018_Hyundai_Santa_Fe_front_6.15.18.jpg",
    turoUrl: "https://turo.com/us/en/suv-rental/united-states/daytona-beach-fl/hyundai/santa-fe-sport/3143340",
    description: "A capable 2018 Santa Fe Sport with AWD and a panoramic sunroof. Ready for beach days, road trips, and everything the Florida sunshine brings.",
  },
  {
    id: "focus-3139374",
    year: 2016,
    make: "Ford",
    model: "Focus",
    color: "White",
    category: "economy",
    seats: 5,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "USB", "Fuel Efficient"],
    // 2016 Ford Focus Titanium Sedan
    image: "https://upload.wikimedia.org/wikipedia/commons/4/45/2016_Ford_Focus_Titanium_Sedan_in_Blue_Candy,_Front_Left,_03-05-2023.jpg",
    turoUrl: "https://turo.com/us/en/car-rental/united-states/daytona-beach-fl/ford/focus/3139374",
    description: "An economical 2016 Ford Focus — our most budget-friendly option. Fuel-efficient and easy to park anywhere in Daytona Beach.",
  },
  {
    id: "corolla-3275798",
    year: 2020,
    make: "Toyota",
    model: "Corolla",
    color: "Black",
    category: "economy",
    seats: 5,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "Apple CarPlay", "Android Auto", "USB-C", "Toyota Safety Sense"],
    // 2020 Toyota Corolla LE sedan (NA market)
    image: "https://upload.wikimedia.org/wikipedia/commons/b/b7/2020_Toyota_Corolla_LE_(NA-market)_front_4.29.19.jpg",
    turoUrl: "https://turo.com/us/en/car-rental/united-states/daytona-beach-fl/toyota/corolla/3275798",
    description: "A dependable 2020 Corolla in black with Toyota's advanced safety suite. Reliable, comfortable, and ready to go.",
  },
  {
    id: "ecosport-3580557",
    year: 2018,
    make: "Ford",
    model: "EcoSport",
    color: "Silver",
    category: "suv",
    seats: 5,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "Apple CarPlay", "Compact SUV", "Easy Parking", "Roof Rack"],
    // 2018 Ford EcoSport SE 4WD
    image: "https://upload.wikimedia.org/wikipedia/commons/7/7f/2018_Ford_EcoSport_SE_4WD,_Front_Right,_09-25-2020.jpg",
    turoUrl: "https://turo.com/us/en/suv-rental/united-states/daytona-beach-fl/ford/ecosport/3580557",
    description: "A nimble 2018 Ford EcoSport — the SUV that fits everywhere. Great for navigating busy Daytona Beach events.",
  },
  {
    id: "elantra-3321200",
    year: 2016,
    make: "Hyundai",
    model: "Elantra",
    color: "Gray",
    category: "economy",
    seats: 5,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "USB", "Fuel Efficient", "Spacious Trunk"],
    // 2016 Hyundai Elantra AD (Avante)
    image: "https://upload.wikimedia.org/wikipedia/commons/a/a8/2016_Hyundai_Avante_AD_(Elantra)_1.6_LPi.jpg",
    turoUrl: "https://turo.com/us/en/car-rental/united-states/daytona-beach-fl/hyundai/elantra/3321200",
    description: "A solid 2016 Hyundai Elantra — reliable, affordable, and easy on gas. A smart choice for budget-conscious travelers.",
  },
  {
    id: "camry-2973721",
    year: 2024,
    make: "Toyota",
    model: "Camry",
    color: "Ivory",
    category: "economy",
    seats: 5,
    transmission: "Automatic",
    mileage: "Unlimited",
    features: ["Bluetooth", "Backup Camera", "Apple CarPlay", "Android Auto", "Adaptive Cruise Control", "Lane Assist", "Wireless Charging"],
    // Toyota Camry XV80 — alternate angle
    image: "https://upload.wikimedia.org/wikipedia/commons/2/28/TOYOTA_CAMRY_(XV80)_China_(9).jpg",
    turoUrl: "https://turo.com/us/en/car-rental/united-states/daytona-beach-fl/toyota/camry/2973721",
    description: "A refined 2024 Camry in ivory — one of our newest additions. Packed with tech, smooth on the highway, and great for any occasion.",
  },
];

export const featuredVehicles = vehicles.filter((v) => v.featured);
