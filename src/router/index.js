import { createRouter, createWebHashHistory } from "vue-router";
import Home from "../views/Home.vue";
import MillionaireGame from "../views/MillionaireGame/index.vue";
import BombGame from "../views/BombGame/index.vue";
import FlashcardGame from "../views/FlashcardGame/index.vue";
import LexiconDefenseGame from "../views/LexiconDefenseGame/index.vue";
import TicTacToeGame from "../views/TicTacToeGame/index.vue";
import WitchPoisonGame from "../views/WitchPoisonGame/index.vue";
import WhackAMole from "../views/Whack-a-MoleGame/index.vue";
import LuckyOneGame from "../views/LuckyOneGame/index.vue";
import MysteryRevealGame from "../views/MysteryRevealGame/index.vue";
import RandomNameGame from "../views/RandomNameGame/index.vue";
import WordPKGame from "../views/WordPKGame/index.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/millionaire",
    name: "MillionaireGame",
    component: MillionaireGame,
  },
  {
    path: "/bomb",
    name: "BombGame",
    component: BombGame,
  },
  {
    path: "/flashcard",
    name: "FlashcardGame",
    component: FlashcardGame,
  },
  {
    path: "/lexicon-defense",
    name: "LexiconDefenseGame",
    component: LexiconDefenseGame,
  },
  {
    path: "/tic-tac-toe",
    name: "TicTacToeGame",
    component: TicTacToeGame,
  },
  {
    path: "/witch-poison",
    name: "WitchPoisonGame",
    component: WitchPoisonGame,
  },
  {
    path: "/Whack-a-Mole",
    name: "Whack-a-Mole",
    component: WhackAMole,
  },
  {
    path: "/lucky-one",
    name: "LuckyOneGame",
    component: LuckyOneGame,
  },
  {
    path: "/mystery-reveal",
    name: "MysteryRevealGame",
    component: MysteryRevealGame,
  },
  {
    path: "/random-name",
    name: "RandomNameGame",
    component: RandomNameGame,
  },
  {
    path: "/word-pk",
    name: "WordPKGame",
    component: WordPKGame,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
