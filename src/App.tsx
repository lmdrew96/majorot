import { useState } from "react";
import { useGame } from "@/store/game";
import { useHydrated } from "@/store/useHydrated";
import { TitleScreen } from "@/screens/TitleScreen";
import { FoundingScreen } from "@/screens/FoundingScreen";
import { PlayScreen } from "@/screens/PlayScreen";
import { CombatScreen } from "@/screens/CombatScreen";
import { ChapterTurnScreen } from "@/screens/ChapterTurnScreen";
import { EndingScreen } from "@/screens/EndingScreen";

function Splash({ text }: { text: string }) {
  return (
    <div className="mj-app">
      <div className="mj-shell mj-center">
        <p className="mj-loading">{text}</p>
      </div>
    </div>
  );
}

/**
 * App shell — no router. The persisted phase drives which screen renders. A
 * local `entered` gate shows the Title (New / Continue) before resuming a save.
 */
export default function App() {
  const hydrated = useHydrated();
  const phase = useGame((s) => s.phase);
  const [entered, setEntered] = useState(false);

  if (!hydrated) return <Splash text="Opening the deck…" />;
  if (!entered) return <TitleScreen onEnter={() => setEntered(true)} />;

  switch (phase) {
    case "founding":
      return <FoundingScreen />;
    case "playing":
      return <PlayScreen />;
    case "combat":
      return <CombatScreen />;
    case "chapterTurn":
      return <ChapterTurnScreen />;
    case "ending":
      return <EndingScreen onReturnToTitle={() => setEntered(false)} />;
    case "title":
    default:
      return <TitleScreen onEnter={() => setEntered(true)} />;
  }
}
