import { RENTAL_REGIONS } from "./regions";

export type RoomiesArea = {
  name: string;
  slug: string;
  searchArea: string;
  allUrl: string;
  roomsUrl?: string;
  nearby?: boolean;
};

// Curated outbound searches. Roomies terms prohibit automated scraping:
// never import Roomies listing details, photos, people or counts into our feed.
const SEARCHES: Record<string, Omit<RoomiesArea, "name" | "slug">> = {
  marlborough: { searchArea: "Blenheim", allUrl: "https://www.roomies.co.nz/blenheim" },
  nelson: { searchArea: "Nelson", allUrl: "https://www.roomies.co.nz/nelson", roomsUrl: "https://www.roomies.co.nz/rooms/nelson" },
  kaikoura: { searchArea: "Kaikōura", allUrl: "https://www.roomies.co.nz/kaikoura" },
  christchurch: { searchArea: "Christchurch", allUrl: "https://www.roomies.co.nz/christchurch", roomsUrl: "https://www.roomies.co.nz/rooms/christchurch" },
  wellington: { searchArea: "Wellington", allUrl: "https://www.roomies.co.nz/wellington", roomsUrl: "https://www.roomies.co.nz/rooms/wellington" },
  dunedin: { searchArea: "Dunedin", allUrl: "https://www.roomies.co.nz/dunedin", roomsUrl: "https://www.roomies.co.nz/rooms/dunedin" },
  invercargill: { searchArea: "Invercargill", allUrl: "https://www.roomies.co.nz/invercargill", roomsUrl: "https://www.roomies.co.nz/rooms/invercargill" },
  timaru: { searchArea: "Timaru", allUrl: "https://www.roomies.co.nz/timaru" },
  "queenstown-lakes": { searchArea: "Queenstown", allUrl: "https://www.roomies.co.nz/queenstown" },
  ashburton: { searchArea: "Ashburton", allUrl: "https://www.roomies.co.nz/ashburton", roomsUrl: "https://www.roomies.co.nz/rooms/ashburton" },
  tauranga: { searchArea: "Tauranga", allUrl: "https://www.roomies.co.nz/tauranga", roomsUrl: "https://www.roomies.co.nz/rooms/tauranga" },
  "mount-maunganui": { searchArea: "Mount Maunganui", allUrl: "https://www.roomies.co.nz/mount-maunganui", roomsUrl: "https://www.roomies.co.nz/rooms/mount-maunganui" },
  arataki: { searchArea: "Mount Maunganui", allUrl: "https://www.roomies.co.nz/mount-maunganui", roomsUrl: "https://www.roomies.co.nz/rooms/mount-maunganui", nearby: true },
  "papamoa-beach": { searchArea: "Pāpāmoa Beach", allUrl: "https://www.roomies.co.nz/papamoa-beach-papamoa", roomsUrl: "https://www.roomies.co.nz/rooms/papamoa-beach-papamoa" },
  otumoetai: { searchArea: "Ōtūmoetai", allUrl: "https://www.roomies.co.nz/otumoetai-tauranga", roomsUrl: "https://www.roomies.co.nz/rooms/otumoetai-tauranga" },
};

export const ROOMIES_AREAS: RoomiesArea[] = RENTAL_REGIONS.map(region => {
  const links = SEARCHES[region.slug];
  if (!links) throw new Error("Missing Roomies link for " + region.slug);
  return { name: region.name, slug: region.slug, ...links };
});

export function roomiesAreaForSlug(slug: string) {
  return ROOMIES_AREAS.find(area => area.slug === slug);
}
