export type PublicRoom = {
  id: string;
  name: string;
  casa: number;
  entrada: number;
  seats: number;
  category: "public" | "professional" | "vip" | "private";
};

export const PUBLIC_ROOMS: PublicRoom[] = [
  { id: "r1", name: "Mesa de práctica", casa: 1, entrada: 20, seats: 3, category: "public" },
  { id: "r2", name: "El Rincón Llanero", casa: 1, entrada: 30, seats: 4, category: "public" },
  { id: "r3", name: "Bodegón Caracas", casa: 2, entrada: 60, seats: 4, category: "public" },
  { id: "r4", name: "La Gallera", casa: 5, entrada: 150, seats: 5, category: "professional" },
  { id: "r5", name: "Club Maracaibo", casa: 10, entrada: 300, seats: 6, category: "vip" },
];

export const BOT_CAST = [
  { name: "Don Chepe", avatar: "🧔" },
  { name: "La Negra", avatar: "👩🏽" },
  { name: "El Catire", avatar: "👱🏻‍♂️" },
  { name: "Doña Rosa", avatar: "👵" },
  { name: "Pancho", avatar: "🧑" },
  { name: "Maite", avatar: "👩" },
  { name: "El Gocho", avatar: "🤠" },
  { name: "Yoli", avatar: "👩" },
] as const;
