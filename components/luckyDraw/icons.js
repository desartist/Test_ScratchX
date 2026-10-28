// Icons shared by the Lucky Draw screens, so a draw type or prize level looks the same everywhere.
import { Award, Gift, Medal, QrCode, Radio, Store, Trophy } from "lucide-react";

export const DRAW_ICON = { physical: Store, live_online: Radio, digital: QrCode };
export const drawIcon = (type) => DRAW_ICON[type] || Trophy;

const LEVEL_ICON = { 1: Trophy, 2: Medal, 3: Award };
export const levelIcon = (rank) => LEVEL_ICON[rank] || Gift;
