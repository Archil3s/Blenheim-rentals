export type CarnivoreRecipe = {
  id: string;
  title: string;
  emoji: string;
  prepMinutes: number;
  portions: number;
  freezerFriendly: boolean;
  ingredients: string[];
  method: string[];
  shopQuery: string;
  sourceLabel: string;
  sourceUrl: string;
};

// These are original, simplified meal-prep recipes built from recurring
// carnivore/keto community patterns rather than copied recipe text.
export const CARNIVORE_RECIPES: CarnivoreRecipe[] = [
  {
    id: "beef-egg-skillet",
    title: "Beef & Egg Meal-Prep Skillet",
    emoji: "🥩",
    prepMinutes: 25,
    portions: 4,
    freezerFriendly: false,
    ingredients: ["1 kg fatty beef mince", "10 eggs", "40 g butter or beef tallow", "Salt"],
    method: [
      "Brown the mince in butter or tallow and keep the rendered fat in the pan.",
      "Whisk in the eggs and cook until just set so they stay moist after reheating.",
      "Divide into four containers and spoon the pan fat across the portions.",
    ],
    shopQuery: "mince",
    sourceLabel: "Reddit carnivore meal-prep pattern",
    sourceUrl: "https://www.reddit.com/r/carnivorediet/comments/1sjeymg/easy_meal_prep_for_the_week/",
  },
  {
    id: "breakfast-casserole",
    title: "Carnivore Breakfast Casserole",
    emoji: "🍳",
    prepMinutes: 55,
    portions: 6,
    freezerFriendly: true,
    ingredients: ["12 eggs", "500 g beef mince", "300 g sugar-free bacon or plain sausage", "125 ml cream", "150 g cheddar", "Salt"],
    method: [
      "Brown the beef and bacon or sausage first.",
      "Whisk eggs with cream, fold through the cooked meat, and top with cheddar.",
      "Bake at 180°C until the centre is set, cool, slice, and portion.",
    ],
    shopQuery: "eggs",
    sourceLabel: "Reddit carnivore casserole pattern",
    sourceUrl: "https://www.reddit.com/r/carnivorediet/comments/1l2l2pr/carnivore_breakfast_casserole_sooooo_good/",
  },
  {
    id: "bacon-cheeseburger-meatballs",
    title: "Bacon Cheeseburger Meatballs",
    emoji: "🧀",
    prepMinutes: 35,
    portions: 5,
    freezerFriendly: true,
    ingredients: ["1 kg beef mince", "250 g bacon, finely chopped", "2 eggs", "150 g cheddar", "Salt"],
    method: [
      "Mix the beef, bacon, eggs, cheddar and salt without overworking the mince.",
      "Shape into meatballs and bake or air-fry until cooked through.",
      "Cool completely; refrigerate a few portions and freeze the rest in single-meal bags.",
    ],
    shopQuery: "beef mince",
    sourceLabel: "YouTube carnivore freezer-meal pattern",
    sourceUrl: "https://www.youtube.com/watch?v=EbTGpq67e3A",
  },
  {
    id: "bacon-beef-rolls",
    title: "Bacon-Wrapped Beef & Cheese Rolls",
    emoji: "🥓",
    prepMinutes: 45,
    portions: 5,
    freezerFriendly: true,
    ingredients: ["900 g beef mince", "3 eggs", "Bacon strips", "Mozzarella or cheddar", "Salt"],
    method: [
      "Season the beef with salt and mix in the eggs.",
      "Form short beef rolls around a small piece of cheese, then wrap each roll in bacon.",
      "Bake or air-fry until browned and cooked through; cool before freezing individual portions.",
    ],
    shopQuery: "bacon",
    sourceLabel: "YouTube carnivore meal-prep roll pattern",
    sourceUrl: "https://www.youtube.com/watch?v=f6T1_y_5UL0",
  },
  {
    id: "burger-eggs",
    title: "Bulk Burger Patties & Eggs",
    emoji: "🍔",
    prepMinutes: 35,
    portions: 5,
    freezerFriendly: true,
    ingredients: ["1.5 kg beef mince", "10 hard-boiled eggs", "Butter or tallow", "Salt"],
    method: [
      "Press mince into thick patties, salt, and cook in batches.",
      "Boil the eggs while the patties cook.",
      "Pack two patties with two eggs per work-lunch box; freeze extra patties separately.",
    ],
    shopQuery: "beef",
    sourceLabel: "Reddit office meal-prep pattern",
    sourceUrl: "https://www.reddit.com/r/carnivore/comments/u3h66v/meal_prep/",
  },
  {
    id: "chuck-roast-boxes",
    title: "Slow-Cooked Chuck Roast Boxes",
    emoji: "🍖",
    prepMinutes: 20,
    portions: 6,
    freezerFriendly: true,
    ingredients: ["1.5–2 kg chuck roast", "Butter or beef tallow", "6–12 eggs", "Salt"],
    method: [
      "Salt the roast and slow-cook until it shreds or slices easily.",
      "Rest, slice or pull the beef, and portion with a little cooking juice or butter.",
      "Add hard-boiled eggs to refrigerated portions and freeze any extra beef portions.",
    ],
    shopQuery: "chuck roast",
    sourceLabel: "Reddit roast meal-prep pattern",
    sourceUrl: "https://www.reddit.com/r/carnivore/comments/1cag73u/quick_easy_meal_prep_ideas/",
  },
  {
    id: "steak-egg-boxes",
    title: "Steak Strip & Egg Boxes",
    emoji: "🥩",
    prepMinutes: 30,
    portions: 4,
    freezerFriendly: false,
    ingredients: ["1.2 kg rump, sirloin or similar steak", "8 eggs", "Butter or tallow", "Salt"],
    method: [
      "Cook steaks slightly less than your final preference so reheating does not dry them out.",
      "Rest well, slice into strips, and portion with hard-boiled or freshly cooked eggs.",
      "Add butter after reheating for moisture and richness.",
    ],
    shopQuery: "steak",
    sourceLabel: "Reddit steak meal-prep pattern",
    sourceUrl: "https://www.reddit.com/r/carnivorediet/comments/1jf0h6h/meal_prepping_steaks/",
  },
  {
    id: "salmon-eggs",
    title: "Salmon, Egg & Butter Boxes",
    emoji: "🐟",
    prepMinutes: 30,
    portions: 4,
    freezerFriendly: false,
    ingredients: ["4 salmon fillets", "8 eggs", "Butter", "Salt"],
    method: [
      "Bake or pan-cook salmon until just done and cool before portioning.",
      "Add two hard-boiled eggs to each container.",
      "Pack butter separately or melt it over the salmon after reheating.",
    ],
    shopQuery: "salmon",
    sourceLabel: "Carnivore community seafood meal pattern",
    sourceUrl: "https://www.reddit.com/r/carnivore/comments/1o3pnaw/needing_help_for_meal_prep/",
  },
];
