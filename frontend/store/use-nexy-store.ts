import { create } from "zustand";

type NexyState = {
  selectedGame: string;
  liveViewers: number;
  setSelectedGame: (game: string) => void;
  setLiveViewers: (viewers: number) => void;
};

export const useNexyStore = create<NexyState>((set) => ({
  selectedGame: "Free Fire Diamonds",
  liveViewers: 18342,
  setSelectedGame: (selectedGame) => set({ selectedGame }),
  setLiveViewers: (liveViewers) => set({ liveViewers })
}));
