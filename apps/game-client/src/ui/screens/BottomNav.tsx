import { Hammer, Pickaxe, Trophy, Users, Warehouse } from "lucide-react";

export type GameSection = "mine" | "base" | "goblins" | "builtMines" | "leaderboard";

export function BottomNav(props: {
  activeSection: GameSection;
  onSectionChange: (section: GameSection) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <button className={props.activeSection === "mine" ? "active" : ""} onClick={() => props.onSectionChange("mine")} type="button">
        <Pickaxe size={18} />
        Рудник
      </button>
      <button className={props.activeSection === "base" ? "active" : ""} onClick={() => props.onSectionChange("base")} type="button">
        <Hammer size={18} />
        База
      </button>
      <button className={props.activeSection === "goblins" ? "active" : ""} onClick={() => props.onSectionChange("goblins")} type="button">
        <Users size={18} />
        Гоблины
      </button>
      <button className={props.activeSection === "builtMines" ? "active" : ""} onClick={() => props.onSectionChange("builtMines")} type="button">
        <Warehouse size={18} />
        Шахты
      </button>
      <button className={props.activeSection === "leaderboard" ? "active" : ""} onClick={() => props.onSectionChange("leaderboard")} type="button">
        <Trophy size={18} />
        Рейтинг
      </button>
    </nav>
  );
}
