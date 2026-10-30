import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, ChevronRight, Crown } from "lucide-react";
import Button from "../components/Button";
const lessons = [
  [
    "A divided kingdom",
    "You belong to one of two factions. Loyal players seek three successful quests. Traitors win with three failed quests, five rejected teams, or a final strike against Merlin.",
  ],
  [
    "A secret to keep",
    "Each player receives a private character. Merlin sees most traitors, but must hide their identity. Percival sees Merlin’s possible identities; Morgana can complicate that knowledge. Mordred is hidden from Merlin. Oberon acts alone.",
  ],
  [
    "Night falls",
    "The host leads a spoken ceremony. Follow the captions, close your eyes when instructed, and privately learn only what your character may know.",
  ],
  [
    "Choose a fellowship",
    "A rotating leader proposes the exact number of players for the next quest. Everyone debates, then privately approves or rejects. A strict majority passes; a tie rejects. Five consecutive rejected teams lose the kingdom.",
  ],
  [
    "The quest unfolds",
    "Chosen players secretly submit. Loyal players must choose Success. Traitors may choose Success or Fail. A single Fail usually ruins a quest; the fourth quest with seven or more players needs two. Individual submissions stay secret.",
  ],
  [
    "One final shadow",
    "After three successful quests, the Assassin chooses who they believe is Merlin. A correct choice wins for Evil. If Merlin survives, the Crown endures.",
  ],
];
export default function Tutorial() {
  const [step, setStep] = useState(0);
  return (
    <main className="page narrow">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Back home
      </Link>
      <div className="panel tutorial">
        <BookOpen className="gold" size={30} />
        <div className="eyebrow">
          HOW TO PLAY · {step + 1} / {lessons.length}
        </div>
        <h1>{lessons[step][0]}</h1>
        <p>{lessons[step][1]}</p>
        <div className="tutorial-progress">
          {lessons.map((l, i) => (
            <button
              aria-label={`Lesson ${i + 1}: ${l[0]}`}
              aria-current={i === step ? "step" : undefined}
              key={l[0]}
              onClick={() => setStep(i)}
              className={i === step ? "active" : ""}
            />
          ))}
        </div>
        <div className="share-buttons">
          <Button
            secondary
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={16} /> Previous
          </Button>
          {step < lessons.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>
              Next <ChevronRight size={16} />
            </Button>
          ) : (
            <Link to="/host" className="button">
              Gather your friends <Crown size={16} />
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
