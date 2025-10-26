const heritagePlaces = [
  {
    name: "Marina Beach",
    location: "Chennai",
    district: "Chennai",
    type: "Beach",
    imageUrl: "http://localhost:5000/images/p_marina.jpg",
    description: "Marina Beach, Chennai’s longest beach, known for sunrise, lighthouse, and food stalls.",
    related_places: ["p_santhome", "p_vivekanandar", "p_light_house"]
  },
  {
    name: "Kapaleeshwarar Temple",
    location: "Mylapore, Chennai",
    district: "Chennai",
    type: "Temple",
    imageUrl: "http://localhost:5000/images/p_kapaleeswarar.jpg",
    description: "Kapaleeshwarar Temple in Mylapore, an ancient Dravidian temple dedicated to Lord Shiva.",
    related_places: ["p_mylapore_tank", "p_santhome"]
  },
  {
    name: "Santhome Cathedral Basilica",
    location: "Mylapore, Chennai",
    district: "Chennai",
    type: "Church",
    imageUrl: "http://localhost:5000/images/p_santhome.jpg",
    description: "Santhome Cathedral Basilica is built over the tomb of St. Thomas, showcasing neo-gothic architecture.",
    related_places: ["p_kapaleeswarar", "p_marina"]
  },
  {
    name: "Valluvar Kottam",
    location: "Nungambakkam, Chennai",
    district: "Chennai",
    type: "Monument",
    imageUrl: "http://localhost:5000/images/p_valluvar.jpg",
    description: "Valluvar Kottam is a monument dedicated to Tamil poet Thiruvalluvar, featuring a massive stone chariot.",
    related_places: ["p_tnagar", "p_kodambakkam"]
  },
  {
    name: "Guindy National Park",
    location: "Guindy, Chennai",
    district: "Chennai",
    type: "Park",
    imageUrl: "http://localhost:5000/images/p_guindy.jpg",
    description: "Guindy National Park hosts blackbucks, spotted deer, snakes, and over 100 bird species.",
    related_places: ["p_snakepark", "p_anna_univ"]
  },
  {
    name: "Egmore Museum",
    location: "Egmore, Chennai",
    district: "Chennai",
    type: "Museum",
    imageUrl: "http://localhost:5000/images/p_egmore.jpg",
    description: "Egmore Museum displays ancient artifacts, bronze idols, and archaeological findings from Tamil Nadu.",
    related_places: ["p_artgallery", "p_egmore_station"]
  },
  {
    name: "Parrys Corner",
    location: "Georgetown, Chennai",
    district: "Chennai",
    type: "Market",
    imageUrl: "http://localhost:5000/images/p_parrys.jpg",
    description: "Parrys Corner is a historic trading hub of Chennai with colonial-era architecture.",
    related_places: ["p_georgetown", "p_fortstgeorge"]
  },
  {
    name: "Vivekanandar Illam",
    location: "Triplicane, Chennai",
    district: "Chennai",
    type: "Museum",
    imageUrl: "http://localhost:5000/images/p_vivekanandar.jpg",
    description: "Vivekanandar Illam showcases the life and teachings of Swami Vivekananda with 3D exhibits.",
    related_places: ["p_marina", "p_kapaleeswarar"]
  },
  {
    name: "Fort St. George",
    location: "Chennai",
    district: "Chennai",
    type: "Historic Fort",
    imageUrl: "http://localhost:5000/images/p_fortstgeorge.jpg",
    description: "Fort St. George, built in 1644, marks the foundation of modern Chennai and houses the Tamil Nadu Legislative Assembly.",
    related_places: ["p_parrys", "p_stmarys"]
  },
  {
    name: "Mahabalipuram",
    location: "Mahabalipuram",
    district: "Chengalpattu",
    type: "Heritage Site",
    imageUrl: "http://localhost:5000/images/p_mahabalipuram.jpg",
    description: "Mahabalipuram, a UNESCO World Heritage site, is famous for shore temples and monolithic rock-cut sculptures.",
    related_places: ["p_shore_temple", "p_arjunas_penance"]
  },
  {
    name: "Besant Nagar Beach",
    location: "Besant Nagar, Chennai",
    district: "Chennai",
    type: "Beach",
    imageUrl: "http://localhost:5000/images/p_besantnagar.jpg",
    description: "Besant Nagar Beach (Elliot’s Beach) is a serene spot known for youth hangouts and the Ashtalakshmi Temple.",
    related_places: ["p_ashtalakshmi", "p_velankanni"]
  },
  {
    name: "Ashtalakshmi Temple",
    location: "Besant Nagar, Chennai",
    district: "Chennai",
    type: "Temple",
    imageUrl: "http://localhost:5000/images/p_ashtalakshmi.jpg",
    description: "Ashtalakshmi Temple near Elliot’s Beach is dedicated to Goddess Lakshmi in eight forms.",
    related_places: ["p_besantnagar", "p_velankanni"]
  },
  {
    name: "Guindy Snake Park",
    location: "Guindy, Chennai",
    district: "Chennai",
    type: "Zoo",
    imageUrl: "http://localhost:5000/images/p_snakepark.jpg",
    description: "Guindy Snake Park exhibits reptiles like cobras, pythons, and monitor lizards, emphasizing conservation education.",
    related_places: ["p_guindy", "p_childrenspark"]
  },
  {
    name: "Birla Planetarium",
    location: "Guindy, Chennai",
    district: "Chennai",
    type: "Science Center",
    imageUrl: "http://localhost:5000/images/p_planetarium.jpg",
    description: "Birla Planetarium offers immersive astronomy shows and science exhibits in Tamil and English.",
    related_places: ["p_guindy", "p_anna_univ"]
  },
  {
    name: "Anna Zoological Park (Vandalur Zoo)",
    location: "Vandalur, Chennai",
    district: "Chennai",
    type: "Zoo",
    imageUrl: "http://localhost:5000/images/p_vandalur.jpg",
    description: "Vandalur Zoo is one of the largest zoos in South Asia, home to tigers, elephants, and aviary species.",
    related_places: ["p_tambaram", "p_crocodilebank"]
  },
  {
    name: "Crocodile Bank",
    location: "Mahabalipuram",
    district: "Chengalpattu",
    type: "Wildlife Sanctuary",
    imageUrl: "http://localhost:5000/images/p_crocodilebank.jpg",
    description: "Crocodile Bank conserves crocodiles, alligators, and gharials, located on the East Coast Road near Mahabalipuram.",
    related_places: ["p_mahabalipuram", "p_vandalur"]
  },
  {
    name: "Pulicat Lake",
    location: "Pulicat",
    district: "Tiruvallur",
    type: "Lake",
    imageUrl: "http://localhost:5000/images/p_pulicat.jpg",
    description: "Pulicat Lake, the second largest brackish water lagoon in India, is known for flamingos and scenic boat rides.",
    related_places: ["p_pulicat_bird_sanctuary", "p_ennore"]
  },
  {
    name: "Arignar Anna Memorial",
    location: "Marina Beach, Chennai",
    district: "Chennai",
    type: "Memorial",
    imageUrl: "http://localhost:5000/images/p_anna_memorial.jpg",
    description: "Arignar Anna Memorial is located on the Marina Beach promenade, honoring Tamil leader C.N. Annadurai.",
    related_places: ["p_mgr_memorial", "p_marina"]
  },
  {
    name: "MGR Memorial",
    location: "Marina Beach, Chennai",
    district: "Chennai",
    type: "Memorial",
    imageUrl: "http://localhost:5000/images/p_mgr_memorial.jpg",
    description: "MGR Memorial is a marble-clad structure dedicated to actor-politician M.G. Ramachandran.",
    related_places: ["p_anna_memorial", "p_marina"]
  },
  {
    name: "Madras High Court",
    location: "Georgetown, Chennai",
    district: "Chennai",
    type: "Historic Building",
    imageUrl: "http://localhost:5000/images/p_highcourt.jpg",
    description: "Madras High Court is one of the oldest in India, renowned for Indo-Saracenic architecture.",
    related_places: ["p_fortstgeorge", "p_parrys"]
  },
];

module.exports = heritagePlaces;