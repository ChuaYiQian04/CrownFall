import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  Crown,
  ArrowRight,
  DoorOpen,
  Shield,
  Users,
  Clock3,
  Sparkles,
  Swords,
} from "lucide-react";
import CrownScene from "../components/CrownScene";
import { isDemo } from "../services/rooms";
export default function Home() {
  return (
    <main className="home">
      <div className="hero">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="eyebrow">
            <span /> TRUST IS A DANGEROUS GAME
          </div>
          <h1>
            Every crown
            <br />
            hides a <em>traitor.</em>
          </h1>
          <p className="hero-description">
            A kingdom divided. A fellowship of secrets.
            <br className="desktop-break" /> Will you protect the crown — or
            bring it down?
          </p>
          <div className="hero-actions">
            <Link to="/host" className="button">
              <Crown size={20} /> Host a game <ArrowRight size={18} />
            </Link>
            <Link to="/join" className="button secondary">
              <DoorOpen size={20} /> Join a game
            </Link>
          </div>
          <p className="no-signup">
            <Shield size={13} /> No downloads. No accounts. Just your next
            betrayal.
          </p>
        </motion.div>
        <CrownScene />
      </div>
      <div className="game-facts">
        <span>
          <Users /> <b>5–10</b> players
        </span>
        <i />
        <span>
          <Clock3 /> <b>20–40</b> minutes
        </span>
        <i />
        <span>
          <Sparkles /> Endless deception
        </span>
      </div>
      <section className="how-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE COUNCIL AWAITS</div>
            <h2>One table. Two loyalties.</h2>
          </div>
          <Link to="/how-to-play">
            Learn the game <ArrowRight size={16} />
          </Link>
        </div>
        <div className="feature-grid">
          <Feature number="01" icon={<Shield />} title="Keep your secret">
            Receive a hidden role. Some serve the crown. Others plot its
            downfall.
          </Feature>
          <Feature number="02" icon={<Swords />} title="Choose your allies">
            Debate, build your fellowship, and embark on quests. Trust
            carefully.
          </Feature>
          <Feature
            number="03"
            icon={<Crown />}
            title="Decide the kingdom’s fate"
          >
            Complete three quests to save the realm. Betray it from within to
            seize the throne.
          </Feature>
        </div>
      </section>
      <div className="gather-note">
        <span className="small-diamond">◆</span> Best played together, with a
        phone in every hand. <span className="small-diamond">◆</span>
      </div>
      {isDemo && (
        <p className="demo-note">
          LOCAL DEMO · Explore the lobby. Connect Supabase to play across
          devices.
        </p>
      )}
    </main>
  );
}
function Feature({
  number,
  icon,
  title,
  children,
}: {
  number: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="feature">
      <div className="feature-top">
        <span className="feature-icon">{icon}</span>
        <span className="feature-number">{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}
